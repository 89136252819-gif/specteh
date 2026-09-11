const MESSAGES: Record<string, string> = {
  plate: "Такой госномер уже есть в парке.",
  orders:
    "Эту технику нельзя удалить: по ней уже есть заявки. Можно изменить данные или поставить статус «Ремонт».",
  type_name: "Тип с таким названием уже есть.",
  type_used: "Тип нельзя удалить: к нему привязаны техника, заявки или цены.",
};

export function FleetAlert({ error }: { error?: string }) {
  const text = error ? MESSAGES[error] : null;
  if (!text) return null;
  return (
    <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 ring-1 ring-amber-200">
      {text}
    </p>
  );
}
