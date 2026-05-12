//go:build windows

package main

import "os"

// On Windows, os.Process.Signal with this stub always returns an error,
// so pidAlive returns false. The bridge is local-host anyway and the
// stale lock will simply be re-pruned next run.
var syscall0 os.Signal = nil
