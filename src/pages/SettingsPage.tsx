// 参数与设置：参数包 / 模板 / 备份与数据 / 回收站
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePayroll } from '@/store';
import { ParamPackPanel } from '@/components/business/settings/ParamPackPanel';
import { TemplatePanel } from '@/components/business/settings/TemplatePanel';
import { BackupPanel } from '@/components/business/settings/BackupPanel';
import { RecycleBin } from '@/components/business/settings/RecycleBin';

export default function SettingsPage() {
  const { refresh } = usePayroll();

  return (
    <Tabs defaultValue="param" className="space-y-4">
      <TabsList>
        <TabsTrigger value="param">参数包</TabsTrigger>
        <TabsTrigger value="template">模板</TabsTrigger>
        <TabsTrigger value="backup">备份与数据</TabsTrigger>
        <TabsTrigger value="recycle">回收站</TabsTrigger>
      </TabsList>
      <TabsContent value="param">
        <ParamPackPanel />
      </TabsContent>
      <TabsContent value="template">
        <TemplatePanel onApplied={refresh} />
      </TabsContent>
      <TabsContent value="backup">
        <BackupPanel onRestored={refresh} />
      </TabsContent>
      <TabsContent value="recycle">
        <RecycleBin onChange={refresh} />
      </TabsContent>
    </Tabs>
  );
}
