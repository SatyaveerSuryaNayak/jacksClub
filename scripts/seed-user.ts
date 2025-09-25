import { userRepository } from "../repositories/user.repository";
import { buildUser } from "../models/user.factory";

async function seed() {
  const user = buildUser({
    id: "u_satyaveer",
    name: "satyaveer",
    email: "nayaksatyaveer@gmail.com",
    balance: 0,
    currency: "INR",
  });

  await userRepository.save(user);
  console.log("Seeded user:", user);
}

seed().catch((err) => {
  console.error("Failed to seed user:", err);
  process.exit(1);
});


