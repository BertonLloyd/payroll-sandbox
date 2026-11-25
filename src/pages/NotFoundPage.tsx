import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function NotFoundPage() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 text-center">
      <p className="text-3xl font-bold text-foreground">404</p>
      <p className="text-sm text-muted-foreground">页面不存在或已被移除</p>
      <Button asChild>
        <Link to="/">返回首页</Link>
      </Button>
    </div>
  );
}
