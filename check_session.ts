import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const session = await prisma.session.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      pronunciationScore: true,
      pronunciationData: true,
    },
  });
  console.log(JSON.stringify(session, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
