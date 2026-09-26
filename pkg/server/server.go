package server

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type Config struct {
	Host           string
	Port           int
	ActiveFilePath string
	Version        string
	StaticFS       fs.FS
}

type Server struct {
	cfg        Config
	listener   net.Listener
	httpServer *http.Server
	port       int
	mu         sync.Mutex
	readyCh    chan struct{}
}

func NewServer(cfg Config) (*Server, error) {
	if cfg.Host == "" {
		cfg.Host = "127.0.0.1"
	}
	if cfg.StaticFS == nil {
		cfg.StaticFS = DistFS()
	}
	if cfg.Version == "" {
		cfg.Version = "1.0.0"
	}

	return &Server{
		cfg:     cfg,
		readyCh: make(chan struct{}),
	}, nil
}

func (s *Server) Port() int {
	<-s.readyCh
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.port
}

func (s *Server) Addr() string {
	<-s.readyCh
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.listener != nil {
		return s.listener.Addr().String()
	}
	return ""
}

func (s *Server) Start(ctx context.Context) error {
	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		close(s.readyCh)
		return fmt.Errorf("failed to listen on %s: %w", addr, err)
	}

	s.mu.Lock()
	s.listener = listener
	s.port = listener.Addr().(*net.TCPAddr).Port
	s.mu.Unlock()
	close(s.readyCh)

	mux := http.NewServeMux()
	s.registerRoutes(mux)

	s.httpServer = &http.Server{
		Handler: mux,
	}

	shutdownErrCh := make(chan error, 1)
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		shutdownErrCh <- s.httpServer.Shutdown(shutdownCtx)
	}()

	serveErr := s.httpServer.Serve(listener)
	if errors.Is(serveErr, http.ErrServerClosed) {
		return <-shutdownErrCh
	}
	return serveErr
}

func (s *Server) registerRoutes(mux *http.ServeMux) {
	// API routes
	mux.HandleFunc("/api/status", s.handleStatus)
	mux.HandleFunc("/api/file", s.handleFile)

	// Static & SPA fallback handler
	fileServer := http.FileServer(http.FS(s.cfg.StaticFS))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		// Check if file exists in StaticFS
		f, err := s.cfg.StaticFS.Open(path)
		if err == nil {
			f.Close()
			fileServer.ServeHTTP(w, r)
			return
		}

		// Fallback to index.html for SPA routing
		indexFile, err := s.cfg.StaticFS.Open("index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		defer indexFile.Close()

		data, err := io.ReadAll(indexFile)
		if err != nil {
			http.Error(w, "Failed to read index.html", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
	})
}
