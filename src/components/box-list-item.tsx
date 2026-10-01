import Link from "next/link";
import { calcBoxFinance } from "@/lib/finance";
import type { BoxWithProducts } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/stat-card";

export function BoxListItem({ box }: { box: BoxWithProducts }) {
  const finance = calcBoxFinance(box, box.products);
  const progress =
    finance.productCount === 0
      ? 0
      : Math.round((finance.soldCount / finance.productCount) * 100);

  return (
    <Link href={`/boxes/${box.id}`} className="block">
      <Card className="transition hover:border-slate-300 hover:shadow-md">
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-lg">{box.number}</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Поступление: {formatDate(box.received_at)}
            </p>
          </div>
          <Badge variant={finance.remainingCount === 0 && finance.productCount > 0 ? "success" : "default"}>
            {finance.soldCount}/{finance.productCount} продано
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-slate-500">Закупка</div>
              <div className="font-medium">{formatEuro(finance.purchaseTotal)}</div>
            </div>
            <div>
              <div className="text-slate-500">Доставка</div>
              <div className="font-medium">{formatEuro(finance.shippingCost)}</div>
            </div>
            <div>
              <div className="text-slate-500">Себестоимость</div>
              <div className="font-medium">{formatEuro(finance.totalCost)}</div>
            </div>
            <div>
              <div className="text-slate-500">На складе</div>
              <div className="font-medium">{finance.remainingCount}</div>
            </div>
            <div>
              <div className="text-slate-500">Выручка</div>
              <div className="font-medium">{formatEuro(finance.revenue)}</div>
            </div>
            <div>
              <div className="text-slate-500">Чистая прибыль</div>
              <div className="font-medium">
                <Money value={finance.netProfit} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
