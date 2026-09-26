package server_test

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/aawc/learning-logo/pkg/server"
)

func TestServerStaticServingAndSPAFallback(t *testing.T) {
	mockFS := fstest.MapFS{
		"index.html": &fstest.MapFile{
			Data: []byte("<!DOCTYPE html><html><head><title>LearningLogo</title></head><body>App</body></html>"),
		},
		"assets/app.js": &fstest.MapFile{
			Data: []byte("console.log('logo');"),
		},
	}

	srv, err := server.NewServer(server.Config{
		Host:     "127.0.0.1",
		Port:     0,
		StaticFS: mockFS,
		Version:  "1.0.0-test",
	})
	if err != nil {
		t.Fatalf("failed to create server: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.Start(ctx)
	}()

	addr := srv.Addr()
	if addr == "" {
		t.Fatal("expected non-empty server address")
	}
	if !strings.HasPrefix(addr, "127.0.0.1:") {
		t.Fatalf("expected loopback bind 127.0.0.1:*, got %s", addr)
	}

	client := &http.Client{Timeout: 2 * time.Second}
	baseURL := fmt.Sprintf("http://%s", addr)

	// 1. Root serves index.html
	resp, err := client.Get(baseURL + "/")
	if err != nil {
		t.Fatalf("failed GET /: %v", err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
	if !strings.Contains(string(body), "LearningLogo") {
		t.Errorf("expected body to contain LearningLogo, got: %s", string(body))
	}

	// 2. Static asset serves exact file
	respAsset, err := client.Get(baseURL + "/assets/app.js")
	if err != nil {
		t.Fatalf("failed GET /assets/app.js: %v", err)
	}
	assetBody, _ := io.ReadAll(respAsset.Body)
	respAsset.Body.Close()
	if respAsset.StatusCode != http.StatusOK {
		t.Errorf("expected status 200, got %d", respAsset.StatusCode)
	}
	if string(assetBody) != "console.log('logo');" {
		t.Errorf("expected asset body, got: %s", string(assetBody))
	}

	// 3. Unknown non-API route falls back to index.html (SPA Fallback)
	respFallback, err := client.Get(baseURL + "/some/virtual/route")
	if err != nil {
		t.Fatalf("failed GET /some/virtual/route: %v", err)
	}
	fallbackBody, _ := io.ReadAll(respFallback.Body)
	respFallback.Body.Close()
	if respFallback.StatusCode != http.StatusOK {
		t.Errorf("expected status 200 for SPA fallback, got %d", respFallback.StatusCode)
	}
	if !strings.Contains(string(fallbackBody), "LearningLogo") {
		t.Errorf("expected SPA fallback to serve index.html, got: %s", string(fallbackBody))
	}

	// 4. Graceful shutdown
	cancel()
	select {
	case err := <-errCh:
		if err != nil && err != http.ErrServerClosed {
			t.Errorf("unexpected error on shutdown: %v", err)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("server failed to shut down in time")
	}
}
