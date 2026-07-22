import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Seed the standard defaults for a newly-created patient: emergency contacts,
 * a general emergency protocol, and a "Getting Started" training category.
 * Mirrors the reference app's seed_consumer_defaults trigger, in app code.
 */
export async function seedPatientDefaults(
  db: Db,
  patientId: string
): Promise<void> {
  await db.emergencyContact.createMany({
    data: [
      {
        patientId,
        name: "911 Emergency",
        phone: "911",
        contactType: "EMERGENCY",
        sortOrder: 0,
      },
      {
        patientId,
        name: "Poison Control",
        phone: "1-800-222-1222",
        contactType: "EMERGENCY",
        sortOrder: 1,
      },
    ],
  });

  await db.emergencyProtocol.create({
    data: {
      patientId,
      title: "General Emergency",
      steps: [
        "Assess the situation and ensure your safety",
        "Call 911 if life-threatening",
        "Administer first aid if trained",
        "Contact the patient's emergency contacts",
        "Document the incident",
      ],
    },
  });

  await db.trainingCategory.create({
    data: {
      patientId,
      name: "Getting Started",
      icon: "book",
      color: "#D4E157",
      sortOrder: 0,
    },
  });
}
