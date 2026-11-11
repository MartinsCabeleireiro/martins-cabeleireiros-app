const fs = require("fs");
const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://josimartinsjm_db_user:YQjlgjT8CB2dnSCN@martinscabeleireiro.dofhfqd.mongodb.net/agenda_oficial";
const fileData = JSON.parse(fs.readFileSync("../imports/contacts_backup_2026-10-30.json", "utf8"));

async function sync() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("agenda_oficial");
    const collection = db.collection("contacts");

    let count = 0;
    for (const doc of fileData) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: doc },
        { upsert: true }
      );
      count++;
    }
    console.log(`✅ Sucesso absoluto! ${count} contatos sincronizados no MongoDB Atlas.`);
  } catch (err) {
    console.error("❌ Erro:", err.message);
  } finally {
    await client.close();
  }
}
sync();
