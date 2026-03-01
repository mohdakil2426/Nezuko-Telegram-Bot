"use client";

/**
 * ChartErrorBoundary
 * React error boundary for chart components — prevents a single chart crash
 * from taking down the entire page.
 */

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children: ReactNode;
  chartName?: string;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `Chart error${this.props.chartName ? ` in ${this.props.chartName}` : ""}:`,
      error,
      info
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8">
          <AlertCircle className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            {this.props.chartName
              ? `${this.props.chartName} failed to render`
              : "Chart failed to render"}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
