import type { Prisma } from '@prisma/client';

export const countedOrderWhere: Prisma.OrderWhereInput = {
  status: { not: 'CANCELLED' },
};

type PackageWithCount = {
  orderLimit: number | null;
  _count: { orders: number };
};

export function withPackageAvailability<T extends PackageWithCount>(pkg: T) {
  const { _count, ...packageData } = pkg;
  const orderCount = _count.orders;
  const remainingOrders = packageData.orderLimit === null
    ? null
    : Math.max(packageData.orderLimit - orderCount, 0);

  return {
    ...packageData,
    orderCount,
    remainingOrders,
    isSoldOut: packageData.orderLimit !== null && orderCount >= packageData.orderLimit,
  };
}
