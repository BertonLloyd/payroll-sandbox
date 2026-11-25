// 新手引导：分步讲清三层模型与操作路径，避免"做出来不会用"
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Step {
  title: string;
  points: string[];
}

const STEPS: Step[] = [
  {
    title: '先理解三层模型',
    points: [
      '组件层：定义"怎么算"，如基本工资、绩效、提成、社保、个税。',
      '结构层：决定"算哪些"，把组件按分组组合成一套薪酬结构。',
      '员工层：员工选择结构，特殊情况可单独覆盖。',
      '覆盖优先级：员工覆盖 > 结构覆盖 > 组件默认值。',
    ],
  },
  {
    title: '第一步：搭建薪酬组件',
    points: [
      '进入"组件库"，新建组件，选择加项或扣项、税前或税后。',
      '五种计算方式：固定金额、按比例、积木公式、阶梯分段、外部输入。',
      '积木公式全程拖拽选择，不写代码，系统自动检测循环引用。',
      '组件可随时编辑、停用、删除，删除项进入回收站可还原。',
    ],
  },
  {
    title: '第二步：组合薪酬结构',
    points: [
      '进入"薪酬结构"，新建结构并设置分组（如固定组、浮动组、扣除组）。',
      '把组件加入结构，调整计算顺序；顺序即依赖与展示顺序。',
      '同一组件在不同结构里可做结构覆盖，实现多套方案差异。',
    ],
  },
  {
    title: '第三步：维护员工',
    points: [
      '进入"员工管理"，为每位员工选择薪酬结构。',
      '个别员工的特殊算法，用员工覆盖按生效月份单独设置。',
      '支持批量算薪，员工可停用或标记离职。',
    ],
  },
  {
    title: '第四步：算薪与确认',
    points: [
      '进入"算薪工作台"，选择年月，录入外部输入数据（如提成基数）。',
      '一键批量算薪，点开工资条查看明细，支持导出。',
      '确认后工资条锁定为快照，不可直接修改，只能作废重算。',
    ],
  },
  {
    title: '参数与数据安全',
    points: [
      '个税起征点、社保公积金比例在"设置-参数包"中维护，可编辑。',
      '所有数据仅保存在本机浏览器，不上传服务器。',
      '清理缓存前请在"设置-备份与数据"中下载全量备份。',
    ],
  },
];

export default function DemoPage() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className={`h-1.5 flex-1 rounded-full ${
              i <= index ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {index + 1}
            </span>
            <h2 className="text-lg font-bold">{step.title}</h2>
          </div>
          <ul className="space-y-2">
            {step.points.map((p) => (
              <li key={p} className="flex gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
        >
          <ArrowLeft className="size-4" /> 上一步
        </Button>
        <span className="text-xs text-muted-foreground">
          {index + 1} / {STEPS.length}
        </span>
        {isLast ? (
          <Button asChild>
            <Link to="/components">
              开始使用 <Check className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => i + 1)}>
            下一步 <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
