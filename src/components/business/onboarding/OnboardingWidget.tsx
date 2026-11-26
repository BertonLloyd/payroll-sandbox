// 新手向导浮动面板：展示分步任务、完成打勾、跳转去完成
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnboarding } from './OnboardingProvider';

export function OnboardingWidget() {
  const { steps, allDone, open, closeGuide, dismiss, goTo } = useOnboarding();

  if (!open) return null;

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="fixed bottom-5 right-5 z-40 w-80 rounded-lg border border-border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">新手任务清单</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {allDone ? '全部完成' : `已完成 ${doneCount} / ${steps.length}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          onClick={closeGuide}
        >
          <X className="size-4" />
        </Button>
      </div>

      <ol className="space-y-1 px-3 py-3">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-2.5 rounded-md px-1 py-1.5">
            <span
              className={[
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px]',
                step.done
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background text-muted-foreground',
              ].join(' ')}
            >
              {step.done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={[
                  'text-sm',
                  step.done ? 'text-muted-foreground line-through' : 'font-medium',
                ].join(' ')}
              >
                {step.title}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{step.hint}</p>
            </div>
            {!step.done && (
              <Button
                size="sm"
                variant="outline"
                className="mt-0.5 h-7 shrink-0 px-2 text-xs"
                onClick={() => goTo(step)}
              >
                去完成
              </Button>
            )}
          </li>
        ))}
      </ol>

      <div className="border-t border-border px-4 py-2.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full text-xs text-muted-foreground"
          onClick={dismiss}
        >
          跳过向导，不再自动提示
        </Button>
      </div>
    </div>
  );
}
