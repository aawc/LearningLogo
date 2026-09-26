package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/aawc/learning-logo/pkg/server"
)

var Version = "1.0.0"

func main() {
	portFlag := flag.Int("port", 0, "Loopback port to bind (default 0 for dynamic)")
	noBrowserFlag := flag.Bool("no-browser", false, "Do not launch default browser automatically")
	versionFlag := flag.Bool("version", false, "Print version and exit")

	flag.Parse()

	if *versionFlag {
		fmt.Printf("LearningLogo v%s\n", Version)
		os.Exit(0)
	}

	var activeFile string
	if flag.NArg() > 0 {
		argPath := flag.Arg(0)
		absPath, err := filepath.Abs(argPath)
		if err == nil {
			activeFile = absPath
		} else {
			activeFile = argPath
		}
	}

	srv, err := server.NewServer(server.Config{
		Host:           "127.0.0.1",
		Port:           *portFlag,
		ActiveFilePath: activeFile,
		Version:        Version,
	})
	if err != nil {
		log.Fatalf("Failed to initialize server: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.Start(ctx)
	}()

	addr := srv.Addr()
	url := fmt.Sprintf("http://%s", addr)
	fmt.Printf("[PASS] LearningLogo desktop server active at %s\n", url)
	if activeFile != "" {
		fmt.Printf("       Active file: %s\n", activeFile)
	}

	if !*noBrowserFlag {
		time.Sleep(100 * time.Millisecond)
		if err := server.OpenBrowser(url); err != nil {
			fmt.Printf("[WARN] Could not automatically open browser: %v\n", err)
			fmt.Printf("       Please open %s manually in your browser.\n", url)
		}
	}

	select {
	case err := <-errCh:
		if err != nil {
			log.Fatalf("Server stopped with error: %v", err)
		}
	case <-ctx.Done():
		fmt.Println("\n[PASS] Shutting down LearningLogo gracefully...")
		<-errCh
	}
}
