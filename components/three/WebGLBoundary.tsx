"use client";

import { Component, type ReactNode } from "react";

interface WebGLBoundaryProps {
  onFailure: () => void;
  children: ReactNode;
}

/** Turns a render error in the scene into the list fallback instead of a blank page. */
export class WebGLBoundary extends Component<WebGLBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
