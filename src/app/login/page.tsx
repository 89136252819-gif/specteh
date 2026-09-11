"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/fields";
import { BrandLogo } from "@/components/brand-logo";

const FEATURES = ["Заявки и календарь", "Счета и акты", "Кабинет водителя"];

function fillDemo(login: string, password: string) {
  const loginEl = document.querySelector<HTMLInputElement>('input[name="login"]');
  const passwordEl = document.querySelector<HTMLInputElement>('input[name="password"]');
  if (loginEl) loginEl.value = login;
  if (passwordEl) passwordEl.value = password;
}

function DemoAccount({
  label,
  hint,
  login,
  password,
}: {
  label: string;
  hint: string;
  login: string;
  password: string;
}) {
  return (
    <button
      className="rounded-2xl bg-slate-50 px-3 py-2.5 text-left ring-1 ring-slate-100 transition hover:bg-menu-soft/50"
      onClick={() => fillDemo(login, password)}
      type="button"
    >
      {label}
      <div className="break-all font-semibold text-navy">{hint}</div>
    </button>
  );
}

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });

  return (
    <div className="grid min-h-screen w-full max-w-full overflow-x-clip lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden overflow-hidden bg-[#3a434d] lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(30,179,168,0.32),transparent_38%),radial-gradient(circle_at_90%_88%,rgba(255,255,255,0.08),transparent_40%)]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="float-orb absolute -left-16 top-20 h-72 w-72 rounded-full bg-menu/25 blur-3xl" />
        <div className="float-orb-delayed absolute -right-10 bottom-8 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <BrandLogo className="relative text-white" glow size="lg" />
        <div className="relative max-w-lg anim-slide-in">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-menu-soft">Рэдианс-СпецТех</p>
          <h1 className="mt-4 text-5xl font-extrabold leading-[1.05] text-white">
            Диспетчерская спецтехники
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">
            Заявки, техника, водители, счета и акты — в одном спокойном кабинете.
          </p>
          <a
            className="relative mt-6 inline-flex h-11 items-center rounded-2xl bg-menu px-5 text-sm font-bold text-white hover:bg-menu-hover"
            href="/order"
          >
            Заказать технику на сайте
          </a>
          <div className="mt-10 flex flex-wrap gap-2">
            {FEATURES.map((item) => (
              <span
                key={item}
                className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-white/35">© ООО «Рэдианс» · внутренний контур</p>
      </div>
      <div className="relative flex items-center justify-center px-4 py-12">
        <div className="page-enter w-full max-w-md rounded-[2rem] border border-white bg-white/95 p-6 shadow-[0_30px_80px_rgba(31,41,51,0.12)] sm:p-9">
          <div className="mb-7 lg:hidden">
            <BrandLogo className="text-navy" size="lg" />
          </div>
          <div className="mb-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-menu" />
            <span className="h-1 w-10 rounded-full bg-menu/70" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-navy">Вход в кабинет</h2>
          <p className="mt-1 text-sm text-slate-500">Менеджер, бухгалтер или водитель</p>
          <p className="mt-2 text-sm">
            <a className="font-semibold text-menu-hover hover:underline" href="/order">
              Заказать спецтехнику без входа
            </a>
          </p>
          <form action={action} className="mt-7 space-y-4">
            <Field label="Логин">
              <Input name="login" autoComplete="username" required placeholder="tlitke" />
            </Field>
            <Field label="Пароль">
              <Input name="password" type="password" autoComplete="current-password" required />
            </Field>
            {state?.error ? <p className="anim-pop text-sm text-slate-600">{state.error}</p> : null}
            <Button className="h-11 w-full" disabled={pending} type="submit">
              {pending ? (
                <>
                  <span className="btn-spinner" />
                  Входим…
                </>
              ) : (
                "Войти"
              )}
            </Button>
          </form>
          <div className="mt-7 grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
            <DemoAccount hint="tlitke / admin123" label="Главный менеджер" login="tlitke" password="admin123" />
            <DemoAccount hint="ezaruchatsky / driver123" label="Водитель" login="ezaruchatsky" password="driver123" />
          </div>
        </div>
      </div>
    </div>
  );
}
