import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { seedPatientDefaults } from "../src/lib/patient-defaults";

const prisma = new PrismaClient();

const PASSWORD = "password123";

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("Clearing existing data...");
  // Deleting users cascades to profiles and all patient-scoped data.
  await prisma.auditLog.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword(PASSWORD);
  const credentials: { role: string; email: string; note?: string }[] = [];

  console.log("Creating admin...");
  const admin = await prisma.user.create({
    data: {
      name: "Site Admin",
      email: "admin@careconnect.demo",
      passwordHash,
      role: "ADMIN",
    },
  });
  credentials.push({ role: "ADMIN", email: admin.email });

  console.log("Creating agencies...");
  const agencyDefs = [
    { name: "Sunrise Care Agency", contact: "Nora Bennett", email: "sunrise@careconnect.demo" },
    { name: "Evergreen Home Health", contact: "Marcus Lee", email: "evergreen@careconnect.demo" },
  ];
  const agencies = [];
  for (const a of agencyDefs) {
    const user = await prisma.user.create({
      data: { name: a.contact, email: a.email, passwordHash, role: "AGENCY" },
    });
    const profile = await prisma.agencyProfile.create({
      data: {
        userId: user.id,
        agencyName: a.name,
        phone: "555-0100",
        address: "100 Main St, Springfield",
      },
    });
    agencies.push(profile);
    credentials.push({ role: "AGENCY", email: a.email, note: a.name });
  }

  console.log("Creating patients...");
  const patientDefs = [
    { name: "Eleanor Whit", email: "eleanor@careconnect.demo", agency: 0 },
    { name: "George Malik", email: "george@careconnect.demo", agency: 0 },
    { name: "Priya Nair", email: "priya@careconnect.demo", agency: 1 },
    { name: "Sam Rivera", email: "sam@careconnect.demo", agency: 1 },
  ];
  const patients = [];
  for (const p of patientDefs) {
    const user = await prisma.user.create({
      data: { name: p.name, email: p.email, passwordHash, role: "PATIENT", phone: "555-0200" },
    });
    const profile = await prisma.patientProfile.create({
      data: {
        userId: user.id,
        agencyId: agencies[p.agency].id,
        address: "42 Elm Avenue",
        notes: "Prefers morning visits.",
      },
    });
    await seedPatientDefaults(prisma, profile.id);
    patients.push({ profile, user });
    credentials.push({ role: "PATIENT", email: p.email, note: p.name });
  }

  console.log("Creating providers...");
  const providerDefs = [
    { name: "Dana Cole", email: "dana@careconnect.demo", title: "Registered Nurse", agency: 0 },
    { name: "Luis Ortega", email: "luis@careconnect.demo", title: "Home Aide", agency: 0 },
    { name: "Aisha Khan", email: "aisha@careconnect.demo", title: "Physical Therapist", agency: 1 },
    { name: "Tom Becker", email: "tom@careconnect.demo", title: "Home Aide", agency: 1 },
  ];
  const providers = [];
  for (const p of providerDefs) {
    const user = await prisma.user.create({
      data: { name: p.name, email: p.email, passwordHash, role: "PROVIDER", phone: "555-0300" },
    });
    const profile = await prisma.providerProfile.create({
      data: {
        userId: user.id,
        agencyId: agencies[p.agency].id,
        title: p.title,
        bio: `${p.title} with years of compassionate care experience.`,
      },
    });
    providers.push({ profile, user });
    credentials.push({ role: "PROVIDER", email: p.email, note: `${p.name} — ${p.title}` });
  }

  console.log("Assigning providers to care teams...");
  // Team assignments: providers 0,1 -> patients 0,1 ; providers 2,3 -> patients 2,3
  const teamMap = [
    { patient: 0, provider: 0 },
    { patient: 0, provider: 1 },
    { patient: 1, provider: 0 },
    { patient: 2, provider: 2 },
    { patient: 2, provider: 3 },
    { patient: 3, provider: 2 },
  ];
  for (const t of teamMap) {
    await prisma.teamMember.create({
      data: {
        patientId: patients[t.patient].profile.id,
        providerId: providers[t.provider].profile.id,
      },
    });
  }

  console.log("Creating schedules and tasks...");
  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i];
    const primaryProvider = providers[i < 2 ? i % 2 : 2 + (i % 2)];

    const shiftDays = [-2, 0, 1, 3];
    for (const d of shiftDays) {
      const isOpen = d === 3;
      const schedule = await prisma.schedule.create({
        data: {
          patientId: patient.profile.id,
          providerId: isOpen ? null : primaryProvider.profile.id,
          shiftDate: daysFromNow(d),
          startTime: "09:00",
          endTime: "13:00",
          isOpen,
          claimed: false,
          notes: isOpen ? "Needs coverage" : "Regular morning shift",
        },
      });

      const taskTitles = ["Administer morning medication", "Assist with breakfast", "Light housekeeping"];
      for (const title of taskTitles) {
        await prisma.shiftTask.create({
          data: {
            scheduleId: schedule.id,
            patientId: patient.profile.id,
            title,
            status: d < 0 ? "COMPLETED" : "PENDING",
            completionNote: d < 0 ? "Completed as scheduled." : null,
            completedAt: d < 0 ? new Date() : null,
          },
        });
      }
    }
  }

  console.log("Creating training content...");
  for (const patient of patients) {
    const category = await prisma.trainingCategory.create({
      data: {
        patientId: patient.profile.id,
        name: "Medication Management",
        icon: "book",
        color: "#4FC3F7",
        sortOrder: 1,
      },
    });
    const moduleRec = await prisma.trainingModule.create({
      data: {
        categoryId: category.id,
        patientId: patient.profile.id,
        name: "Administering Insulin",
        instructions: "Review the steps before each administration.",
      },
    });
    await prisma.trainingMedia.create({
      data: {
        moduleId: moduleRec.id,
        patientId: patient.profile.id,
        displayName: "Insulin injection guide",
        mediaType: "VIDEO",
        url: "https://www.example.com/insulin-guide",
      },
    });
  }

  console.log("Creating announcements and messages...");
  for (let i = 0; i < patients.length; i++) {
    const patient = patients[i];
    const agencyUser = await prisma.agencyProfile.findUnique({
      where: { id: patient.profile.agencyId! },
      include: { user: true },
    });
    const author = agencyUser!.user;
    const announcement = await prisma.announcement.create({
      data: {
        patientId: patient.profile.id,
        authorId: author.id,
        authorName: author.name,
        label: "ANNOUNCEMENT",
        title: "Welcome to CareConnect",
        body: "This is the shared feed for the care circle. Post updates here.",
      },
    });
    await prisma.announcementComment.create({
      data: {
        announcementId: announcement.id,
        authorId: patient.user.id,
        authorName: patient.user.name,
        body: "Thank you! Looking forward to using this.",
      },
    });

    const provider = providers[i < 2 ? 0 : 2];
    await prisma.directMessage.create({
      data: {
        patientId: patient.profile.id,
        senderId: provider.user.id,
        receiverId: patient.user.id,
        body: "Hello! I'll be visiting tomorrow morning.",
      },
    });
  }

  console.log("Creating hospitals and invite codes...");
  for (const patient of patients) {
    await prisma.emergencyHospital.create({
      data: {
        patientId: patient.profile.id,
        name: "Springfield General Hospital",
        address: "500 Health Blvd, Springfield",
        distance: "2.3 miles",
      },
    });
  }

  const invite30 = new Date();
  invite30.setDate(invite30.getDate() + 30);
  const providerInvite = await prisma.inviteCode.create({
    data: {
      code: "PROVIDER1",
      intendedRole: "PROVIDER",
      patientId: patients[0].profile.id,
      agencyId: agencies[0].id,
      expiresAt: invite30,
      createdByUserId: admin.id,
    },
  });
  const patientInvite = await prisma.inviteCode.create({
    data: {
      code: "PATIENT01",
      intendedRole: "PATIENT",
      agencyId: agencies[0].id,
      expiresAt: invite30,
      createdByUserId: admin.id,
    },
  });

  console.log("\n========================================");
  console.log(" CareConnect demo credentials");
  console.log(" (all passwords: " + PASSWORD + ")");
  console.log("========================================");
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(pad("ROLE", 10) + pad("EMAIL", 32) + "NOTE");
  console.log("-".repeat(70));
  for (const c of credentials) {
    console.log(pad(c.role, 10) + pad(c.email, 32) + (c.note ?? ""));
  }
  console.log("-".repeat(70));
  console.log("Invite codes:");
  console.log(`  ${providerInvite.code}  (PROVIDER → ${patientDefs[0].name}'s team)`);
  console.log(`  ${patientInvite.code}  (PATIENT → Sunrise Care Agency)`);
  console.log("========================================\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
