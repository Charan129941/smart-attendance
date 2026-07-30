import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('changeme123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@college.edu' },
    update: {},
    create: {
      email: 'admin@college.edu',
      name: 'Admin Faculty',
      passwordHash,
      role: 'admin',
    },
  });

  console.log('Created admin user:', admin.email);

  // Create hello user
  const helloPasswordHash = await bcrypt.hash('hello', 10);
  const hello = await prisma.user.upsert({
    where: { email: 'hello' },
    update: {},
    create: {
      email: 'hello',
      name: 'Hello User',
      passwordHash: helloPasswordHash,
      role: 'admin',
    },
  });

  console.log('Created user:', hello.email);

  // Sample classes
  const classes = [
    { name: 'B.Tech CSE', section: 'A', year: 3 },
    { name: 'B.Tech CSE', section: 'B', year: 3 },
    { name: 'B.Tech IT', section: 'A', year: 2 },
  ];

  for (const c of classes) {
    await prisma.class.upsert({
      where: { name_section: { name: c.name, section: c.section } },
      update: {},
      create: c,
    });
  }
  console.log('Created classes');

  // Sample subjects
  const subjects = [
    { name: 'Data Structures and Algorithms', code: 'CS201' },
    { name: 'Operating Systems', code: 'CS301' },
    { name: 'Database Management Systems', code: 'CS302' },
    { name: 'Computer Networks', code: 'CS401' },
  ];

  for (const s of subjects) {
    await prisma.subject.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }
  console.log('Created subjects');

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
