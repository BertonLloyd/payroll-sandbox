// 首页：起步入口（三套模板）+ 数据概览 + 快速导航
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calculator,
  Layers,
  Puzzle,
  Users,
} from 'lucide-react';
import { usePayroll } from '@/store';
import { applyTemplate } from '@/services/applyTemplate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const TEMPLATE_CARDS = [
  { category: 'general-service', label: '通用服务业', desc: '固定+绩效+津贴，适合职能岗位' },
  { category: 'chain-store', label: '连锁门店', desc: '低固定+业绩提成，门店/口腔场景' },
  { category: 'sales', label: '销售型', desc: '低底薪+阶梯提成，高浮动团队' },
];

export default function HomePage() {
  const { components, structures, employees, templates, refresh } =
    usePayroll();

  const stats = [
    { icon: Puzzle, label: '薪酬组件', value: components.length },
    { icon: Layers, label: '薪酬结构', value: structures.length },
    { icon: Users, label: '员工', value: employees.length },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">选择一套模板快速起步</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          模板生成后，所有组件、结构均可自由增删改；也可直接从空白搭建。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {TEMPLATE_CARDS.map((card) => {
          const template = templates.find(
            (t) => t.category === card.category,
          );
          return (
            <Card key={card.category} className="hover:border-primary">
              <CardContent className="space-y-3 p-5">
                <div>
                  <p className="font-semibold">{card.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.desc}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    if (!template) return;
                    await applyTemplate(template);
                    await refresh();
                    toast.success(`已应用：${card.label}`);
                  }}
                >
                  使用此模板
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-5">
              <s.icon className="size-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button asChild variant="outline">
          <Link to="/components">
            <Puzzle className="size-4" /> 进入组件库
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/payroll">
            <Calculator className="size-4" /> 算薪工作台
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/demo">
            查看新手引导 <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
