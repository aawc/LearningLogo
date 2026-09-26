package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

var allowedExtensions = map[string]bool{
	".logo": true,
	".txt":  true,
	".json": true,
}

type StatusResponse struct {
	Version    string `json:"version"`
	Platform   string `json:"platform"`
	ActiveFile string `json:"activeFile"`
	Port       int    `json:"port"`
}

type FileWriteRequest struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

type FileWriteResponse struct {
	Success bool   `json:"success"`
	Path    string `json:"path"`
}

func (s *Server) verifyHostAndClient(w http.ResponseWriter, r *http.Request) bool {
	// 1. Host header validation to prevent DNS rebinding
	host := r.Host
	if h, _, err := net.SplitHostPort(host); err == nil {
		host = h
	}
	if host != "127.0.0.1" && host != "localhost" && host != s.cfg.Host {
		http.Error(w, "Forbidden: Invalid Host", http.StatusForbidden)
		return false
	}

	// 2. Origin header validation (if present)
	origin := r.Header.Get("Origin")
	if origin != "" {
		u, err := url.Parse(origin)
		if err != nil {
			http.Error(w, "Forbidden: Invalid Origin", http.StatusForbidden)
			return false
		}
		origHost := u.Hostname()
		if origHost != "127.0.0.1" && origHost != "localhost" && origHost != s.cfg.Host {
			http.Error(w, "Forbidden: Invalid Origin", http.StatusForbidden)
			return false
		}
	}

	// 3. Custom client header verification
	if r.Header.Get("X-LearningLogo-Client") != "1" {
		http.Error(w, "Forbidden: Missing X-LearningLogo-Client header", http.StatusForbidden)
		return false
	}

	return true
}

func sanitizePath(p string) (string, error) {
	if p == "" {
		return "", fmt.Errorf("empty path")
	}

	// Reject any path containing ".." traversal sequences
	if strings.Contains(p, "..") {
		return "", fmt.Errorf("path traversal attempt detected")
	}

	ext := strings.ToLower(filepath.Ext(p))
	if !allowedExtensions[ext] {
		return "", fmt.Errorf("file type %q not allowed; must be .logo, .txt, or .json", ext)
	}

	cleaned := filepath.Clean(p)
	if !filepath.IsAbs(cleaned) {
		abs, err := filepath.Abs(cleaned)
		if err != nil {
			return "", fmt.Errorf("invalid path: %w", err)
		}
		cleaned = abs
	}

	return cleaned, nil
}

func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	if !s.verifyHostAndClient(w, r) {
		return
	}

	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	resp := StatusResponse{
		Version:    s.cfg.Version,
		Platform:   runtime.GOOS,
		ActiveFile: s.cfg.ActiveFilePath,
		Port:       s.Port(),
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(resp)
}

func (s *Server) handleFile(w http.ResponseWriter, r *http.Request) {
	if !s.verifyHostAndClient(w, r) {
		return
	}

	switch r.Method {
	case http.MethodGet:
		targetPath := r.URL.Query().Get("path")
		if targetPath == "" {
			targetPath = s.cfg.ActiveFilePath
		}
		if targetPath == "" {
			http.Error(w, "Path required", http.StatusBadRequest)
			return
		}

		safePath, err := sanitizePath(targetPath)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		data, err := os.ReadFile(safePath)
		if err != nil {
			if os.IsNotExist(err) {
				http.NotFound(w, r)
			} else {
				http.Error(w, fmt.Sprintf("Failed to read file: %v", err), http.StatusInternalServerError)
			}
			return
		}

		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)

	case http.MethodPost:
		var req FileWriteRequest
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "Failed to read body", http.StatusBadRequest)
			return
		}
		_ = r.Body.Close()

		if err := json.Unmarshal(bodyBytes, &req); err != nil {
			req.Path = r.URL.Query().Get("path")
			req.Content = string(bodyBytes)
		}

		if req.Path == "" {
			req.Path = s.cfg.ActiveFilePath
		}
		if req.Path == "" {
			http.Error(w, "Path required", http.StatusBadRequest)
			return
		}

		safePath, err := sanitizePath(req.Path)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := os.WriteFile(safePath, []byte(req.Content), 0644); err != nil {
			http.Error(w, fmt.Sprintf("Failed to write file: %v", err), http.StatusInternalServerError)
			return
		}

		s.mu.Lock()
		s.cfg.ActiveFilePath = safePath
		s.mu.Unlock()

		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_ = json.NewEncoder(w).Encode(FileWriteResponse{
			Success: true,
			Path:    safePath,
		})

	default:
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
	}
}
