//go:build !windows

package main

import "syscall"

var syscall0 syscall.Signal = syscall.Signal(0)
