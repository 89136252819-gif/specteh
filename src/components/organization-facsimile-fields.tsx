"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { removeOrganizationFacsimile, uploadOrganizationFacsimile } from "@/actions/catalogs";
import { Button } from "@/components/ui/button";

export function OrganizationFacsimileFields({
  orgId,
  signatureFile,
  stampFile,
}: {
  orgId: string;
  signatureFile: string | null;
  stampFile: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const signatureRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);

  function upload(kind: "signature" | "stamp", file: File | undefined) {
    if (!file) return;
    setError("");
    const formData = new FormData();
    formData.set("orgId", orgId);
    formData.set("kind", kind);
    formData.set("file", file);
    start(async () => {
      const result = await uploadOrganizationFacsimile(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(kind: "signature" | "stamp") {
    setError("");
    start(async () => {
      const result = await removeOrganizationFacsimile(orgId, kind);
      if (result && "error" in result && result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div>
        <p className="text-sm font-semibold text-navy">Факсимиле для PDF</p>
        <p className="mt-1 text-xs text-slate-500">PNG или WebP с прозрачным фоном, до 2 МБ. Появятся в счёте и акте.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FacsimileSlot
          hasFile={Boolean(signatureFile)}
          inputRef={signatureRef}
          kind="signature"
          label="Подпись руководителя"
          onRemove={() => remove("signature")}
          onSelect={(file) => upload("signature", file)}
          orgId={orgId}
          pending={pending}
        />
        <FacsimileSlot
          hasFile={Boolean(stampFile)}
          inputRef={stampRef}
          kind="stamp"
          label="Печать М.П."
          onRemove={() => remove("stamp")}
          onSelect={(file) => upload("stamp", file)}
          orgId={orgId}
          pending={pending}
        />
      </div>
      {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}

function FacsimileSlot({
  orgId,
  kind,
  label,
  hasFile,
  pending,
  inputRef,
  onSelect,
  onRemove,
}: {
  orgId: string;
  kind: "signature" | "stamp";
  label: string;
  hasFile: boolean;
  pending: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (file: File | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-navy">{label}</p>
      <div className="mt-2 flex min-h-24 items-center justify-center rounded-xl bg-white ring-1 ring-slate-100">
        {hasFile ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={label}
            className="max-h-20 max-w-full object-contain p-2"
            src={`/api/org-asset/${orgId}?kind=${kind}&t=${kind}`}
          />
        ) : (
          <span className="text-xs text-slate-400">Не загружено</span>
        )}
      </div>
      <input
        accept="image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          onSelect(event.target.files?.[0]);
          event.target.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => inputRef.current?.click()} size="sm" type="button" variant="secondary">
          {hasFile ? "Заменить" : "Загрузить"}
        </Button>
        {hasFile ? (
          <Button disabled={pending} onClick={onRemove} size="sm" type="button" variant="ghost">
            Удалить
          </Button>
        ) : null}
      </div>
    </div>
  );
}
