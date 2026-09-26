package server_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/aawc/learning-logo/pkg/server"
)

func TestAPISecurityAndFileOperations(t *testing.T) {
	tempDir := t.TempDir()
	testLogoFile := filepath.Join(tempDir, "test_drawing.logo")
	initialContent := "TO SQUARE\n  REPEAT 4 [ FD 50 RT 90 ]\nEND\n"
	if err := os.WriteFile(testLogoFile, []byte(initialContent), 0644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	srv, err := server.NewServer(server.Config{
		Host:           "127.0.0.1",
		Port:           0,
		Version:        "1.2.3",
		ActiveFilePath: testLogoFile,
	})
	if err != nil {
		t.Fatalf("failed to create server: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go func() {
		_ = srv.Start(ctx)
	}()

	addr := srv.Addr()
	client := &http.Client{Timeout: 2 * time.Second}
	baseURL := fmt.Sprintf("http://%s", addr)

	// 1. GET /api/status returns JSON metadata when authorized
	t.Run("Status Endpoint", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, baseURL+"/api/status", nil)
		req.Header.Set("X-LearningLogo-Client", "1")
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("failed GET /api/status: %v", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}

		var status map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&status); err != nil {
			t.Fatalf("failed to decode status json: %v", err)
		}

		if status["version"] != "1.2.3" {
			t.Errorf("expected version 1.2.3, got %v", status["version"])
		}
		if status["activeFile"] != testLogoFile {
			t.Errorf("expected activeFile %s, got %v", testLogoFile, status["activeFile"])
		}
		if status["platform"] == nil || status["platform"] == "" {
			t.Errorf("expected platform to be populated")
		}
	})

	// 2. Client Header Requirement
	t.Run("Client Header Requirement", func(t *testing.T) {
		// Missing header -> 403 Forbidden
		req, _ := http.NewRequest(http.MethodGet, baseURL+"/api/status", nil)
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("request error: %v", err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusForbidden {
			t.Errorf("expected 403 for missing X-LearningLogo-Client header, got %d", resp.StatusCode)
		}
	})

	// 3. Host Header Validation
	t.Run("Host Header Validation", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, baseURL+"/api/status", nil)
		req.Header.Set("X-LearningLogo-Client", "1")
		req.Host = "attacker.example.com"
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("request error: %v", err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusForbidden {
			t.Errorf("expected 403 for disallowed Host header, got %d", resp.StatusCode)
		}
	})

	// 4. Origin Security Check
	t.Run("Origin Header Security", func(t *testing.T) {
		// Disallowed external origin
		reqEvil, _ := http.NewRequest(http.MethodGet, baseURL+"/api/status", nil)
		reqEvil.Header.Set("X-LearningLogo-Client", "1")
		reqEvil.Header.Set("Origin", "http://malicious-website.com")
		respEvil, err := client.Do(reqEvil)
		if err != nil {
			t.Fatalf("request error: %v", err)
		}
		respEvil.Body.Close()
		if respEvil.StatusCode != http.StatusForbidden {
			t.Errorf("expected 403 Forbidden for evil origin, got %d", respEvil.StatusCode)
		}

		// Allowed localhost origin
		reqGood, _ := http.NewRequest(http.MethodGet, baseURL+"/api/status", nil)
		reqGood.Header.Set("X-LearningLogo-Client", "1")
		reqGood.Header.Set("Origin", fmt.Sprintf("http://127.0.0.1:%d", srv.Port()))
		respGood, err := client.Do(reqGood)
		if err != nil {
			t.Fatalf("request error: %v", err)
		}
		respGood.Body.Close()
		if respGood.StatusCode != http.StatusOK {
			t.Errorf("expected 200 OK for loopback origin, got %d", respGood.StatusCode)
		}
	})

	// 5. GET /api/file reads file content
	t.Run("Get File Content", func(t *testing.T) {
		req, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/api/file?path=%s", baseURL, testLogoFile), nil)
		req.Header.Set("X-LearningLogo-Client", "1")
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("failed GET /api/file: %v", err)
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}
		if string(body) != initialContent {
			t.Errorf("expected content %q, got %q", initialContent, string(body))
		}
	})

	// 6. POST /api/file writes updated content
	t.Run("Post File Content", func(t *testing.T) {
		newContent := "TO TRIANGLE\n  REPEAT 3 [ FD 80 RT 120 ]\nEND\n"
		payload, _ := json.Marshal(map[string]string{
			"path":    testLogoFile,
			"content": newContent,
		})

		req, _ := http.NewRequest(http.MethodPost, baseURL+"/api/file", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-LearningLogo-Client", "1")
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("failed POST /api/file: %v", err)
		}
		resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}

		readBack, err := os.ReadFile(testLogoFile)
		if err != nil {
			t.Fatalf("failed to read back file: %v", err)
		}
		if string(readBack) != newContent {
			t.Errorf("expected written content %q, got %q", newContent, string(readBack))
		}
	})

	// 7. Path Traversal Protection
	t.Run("Path Traversal Protection", func(t *testing.T) {
		invalidPath := tempDir + "/../../etc/passwd.logo"
		req, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/api/file?path=%s", baseURL, invalidPath), nil)
		req.Header.Set("X-LearningLogo-Client", "1")
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("failed request: %v", err)
		}
		resp.Body.Close()

		if resp.StatusCode != http.StatusBadRequest && resp.StatusCode != http.StatusForbidden {
			t.Errorf("expected 400 or 403 for path traversal, got %d", resp.StatusCode)
		}
	})

	// 8. Extension Restriction
	t.Run("File Extension Restriction", func(t *testing.T) {
		disallowedPath := filepath.Join(tempDir, "script.sh")
		req, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/api/file?path=%s", baseURL, disallowedPath), nil)
		req.Header.Set("X-LearningLogo-Client", "1")
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("failed request: %v", err)
		}
		resp.Body.Close()

		if resp.StatusCode != http.StatusBadRequest {
			t.Errorf("expected 400 Bad Request for disallowed extension, got %d", resp.StatusCode)
		}
	})

	// 9. Non-existent file returns 404
	t.Run("Non-existent File", func(t *testing.T) {
		missingPath := filepath.Join(tempDir, "does_not_exist.logo")
		req, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("%s/api/file?path=%s", baseURL, missingPath), nil)
		req.Header.Set("X-LearningLogo-Client", "1")
		resp, err := client.Do(req)
		if err != nil {
			t.Fatalf("failed request: %v", err)
		}
		resp.Body.Close()

		if resp.StatusCode != http.StatusNotFound {
			t.Errorf("expected 404 for missing file, got %d", resp.StatusCode)
		}
	})
}
