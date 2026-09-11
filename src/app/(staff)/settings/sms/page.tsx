import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { SmsDirectory } from "@/components/sms-directory";
import { getMaxSetup, MAX_KEYS } from "@/lib/max";

export default async function SmsSettingsPage() {
  const hidden = Object.values(MAX_KEYS);
  const [templates, logs, maxSetup] = await Promise.all([
    prisma.smsTemplate.findMany({ where: { key: { notIn: hidden } }, orderBy: { name: "asc" } }),
    prisma.smsLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    getMaxSetup(),
  ]);

  return (
    <div>
      <PageHeader
        title="Уведомления"
        subtitle="MAX офису, водителям и заказчикам. SMS не отправляем."
      />
      <SmsDirectory
        channels={{ sms: maxSetup.sms, max: maxSetup.max }}
        logs={logs.map((log) => ({
          id: log.id,
          createdAt: log.createdAt.toISOString(),
          to: log.to,
          status: log.status,
          text: log.text,
        }))}
        maxSetup={maxSetup}
        templates={templates.map((template) => ({
          id: template.id,
          key: template.key,
          name: template.name,
          text: template.text,
        }))}
      />
    </div>
  );
}
