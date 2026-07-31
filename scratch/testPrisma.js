const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const className = 'TestClass';
    const section = 'A';
    
    const classObj = await prisma.class.upsert({
      where: { name_section: { name: className || '', section: section || '' } },
      update: {},
      create: { name: className || '', section: section || '' },
    });
    console.log('Class upsert successful', classObj);
    
    const subject = 'TestSubject';
    const subjectObj = await prisma.subject.upsert({
      where: { name: subject },
      update: {},
      create: { name: subject },
    });
    console.log('Subject upsert successful', subjectObj);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
