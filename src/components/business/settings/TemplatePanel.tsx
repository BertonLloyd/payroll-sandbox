// 模板面板：列出内置模板，应用时创建独立方案并切换过去
import { usePayroll } from '@/store';
import { useScheme } from '@/store/SchemeProvider';
import { createSchemeFromTemplate } from '@/services/schemeService';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { toast } from 'sonner';

const CATEGORY_LABEL: Record<string, string> = {
  'general-service': '通用服务业',
  'chain-store': '连锁门店',
  sales: '销售型',
  blank: '空白',
};

export function TemplatePanel({ onApplied }: { onApplied(): void }) {
  const { templates } = usePayroll();
  const { setCurrentScheme, refresh } = useScheme();

  return (
    <div className="grid grid-cols-3 gap-3">
      {templates
        .filter((t) => t.builtIn)
        .map((t) => (
          <Card key={t.id}>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground">
                  {CATEGORY_LABEL[t.category] ?? t.category} ·{' '}
                  {t.payload.components.length} 个组件
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  try {
                    const scheme = await createSchemeFromTemplate(t);
                    await refresh();
                    setCurrentScheme(scheme.id);
                    toast.success(`已应用模板：${t.name}`);
                    onApplied();
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : '应用失败',
                    );
                  }
                }}
              >
                应用此模板
              </Button>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
