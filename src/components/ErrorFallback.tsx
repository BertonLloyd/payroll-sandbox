import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorFallbackProps {
  error: unknown;
  resetErrorBoundary: () => void;
}

export default function ErrorFallback({
  error,
  resetErrorBoundary,
}: ErrorFallbackProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">应用出现错误</h2>
              <p className="text-sm text-muted-foreground">抱歉，页面运行时遇到了异常</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
            <p className="text-xs font-mono text-foreground/80 break-all whitespace-pre-wrap">
              {error instanceof Error ? error.message : String(error)}
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={resetErrorBoundary} className="flex-1 gap-2">
              <RefreshCcw className="size-4" />
              重试
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              刷新页面
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
