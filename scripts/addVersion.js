db.events.updateMany({}, { $set: { version: 1 }})
db.events.updateOne(
  { url: 'la-musica-en-la-cadena-de-bloques' },
  { $set: { version: 0 }}
)
