import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting workspace migration...');
  
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users to migrate.`);
  
  for (const user of users) {
    console.log(`Processing user: ${user.email} (${user.id})`);
    
    // Check if user already has a personal workspace
    let personalWorkspace = await prisma.workspace.findFirst({
      where: {
        isPersonal: true,
        members: {
          some: {
            userId: user.id,
            role: 'OWNER'
          }
        }
      }
    });
    
    if (!personalWorkspace) {
      console.log(`  Creating personal workspace for ${user.email}`);
      personalWorkspace = await prisma.workspace.create({
        data: {
          name: 'Personal',
          description: 'Your personal workspace',
          isPersonal: true,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER'
            }
          }
        }
      });
    } else {
      console.log(`  User already has a personal workspace: ${personalWorkspace.id}`);
    }
    
    // Migrate Tasks
    const { count: tasksCount } = await prisma.task.updateMany({
      where: {
        userId: user.id,
        workspaceId: null,
      },
      data: {
        workspaceId: personalWorkspace.id,
      }
    });
    console.log(`  Migrated ${tasksCount} tasks.`);
    
    // Migrate Projects
    const { count: projectsCount } = await prisma.project.updateMany({
      where: {
        userId: user.id,
        workspaceId: null,
      },
      data: {
        workspaceId: personalWorkspace.id,
      }
    });
    console.log(`  Migrated ${projectsCount} projects.`);
    
    // Migrate Goals
    const { count: goalsCount } = await prisma.goal.updateMany({
      where: {
        userId: user.id,
        workspaceId: null,
      },
      data: {
        workspaceId: personalWorkspace.id,
      }
    });
    console.log(`  Migrated ${goalsCount} goals.`);
    
    // Migrate Habits
    const { count: habitsCount } = await prisma.habit.updateMany({
      where: {
        userId: user.id,
        workspaceId: null,
      },
      data: {
        workspaceId: personalWorkspace.id,
      }
    });
    console.log(`  Migrated ${habitsCount} habits.`);
    
    // Migrate Notes
    const { count: notesCount } = await prisma.note.updateMany({
      where: {
        userId: user.id,
        workspaceId: null,
      },
      data: {
        workspaceId: personalWorkspace.id,
      }
    });
    console.log(`  Migrated ${notesCount} notes.`);
    
    // Migrate Tags
    const { count: tagsCount } = await prisma.tag.updateMany({
      where: {
        userId: user.id,
        workspaceId: null,
      },
      data: {
        workspaceId: personalWorkspace.id,
      }
    });
    console.log(`  Migrated ${tagsCount} tags.`);
    
    // Migrate Calendar Events
    const { count: eventsCount } = await prisma.calendarEvent.updateMany({
      where: {
        userId: user.id,
        workspaceId: null,
      },
      data: {
        workspaceId: personalWorkspace.id,
      }
    });
    console.log(`  Migrated ${eventsCount} calendar events.`);
  }
  
  console.log('Migration completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
