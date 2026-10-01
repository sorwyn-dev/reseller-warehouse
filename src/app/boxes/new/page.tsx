import Link from "next/link";
import { CreateBoxForm } from "@/components/create-box-form";

export default function NewBoxPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← Назад к обзору
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
          Добавить коробку
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Укажите доставку и доп. расходы, затем быстро заполните список вещей.
        </p>
      </div>
      <CreateBoxForm />
    </div>
  );
}
