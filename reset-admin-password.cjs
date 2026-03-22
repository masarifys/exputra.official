const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const prisma = new PrismaClient();
  
  try {
    // New password
    const newPassword = 'Admin@12345';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Check if admin exists
    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!admin) {
      // Create new admin if doesn't exist
      admin = await prisma.user.create({
        data: {
          email: 'admin@exputra.id',
          name: 'Administrator',
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
      console.log('✅ Admin user created!');
    } else {
      // Update existing admin password
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword }
      });
      console.log('✅ Admin password updated!');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📧 Email: ' + admin.email);
    console.log('🔐 Password: ' + newPassword);
    console.log('👤 Name: ' + admin.name);
    console.log('=' .repeat(60));
    console.log('\n✨ You can now login to /admin/login\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
