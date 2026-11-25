// 页面占位：路由骨架阶段使用，后续逐页替换为真实功能
export function PagePlaceholder({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
