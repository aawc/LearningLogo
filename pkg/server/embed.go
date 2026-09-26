package server

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distEmbedFS embed.FS

// DistFS returns an fs.FS sub-rooted at "dist", or the raw embed.FS if sub-rooting fails.
func DistFS() fs.FS {
	sub, err := fs.Sub(distEmbedFS, "dist")
	if err != nil {
		return distEmbedFS
	}
	return sub
}
