// Sample data comes with the specs that create the models (users in 001, sites in 002)
async function seed(): Promise<void> {}

seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
