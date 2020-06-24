const description3 = 'En este primer encuentro de Blockchain en las Artes, Juan David Reyes y yo, Emilio Silva, vamos a hacer una introducción a la tecnología blockchain y a las criptomonedas, mencionando conceptos de especial interés para los y las artistas: la escasez digital, la propiedad de una obra digital, la trazabilidad, la noción de original y copia, las problemáticas ambientales y sociales alrededor de las criptomonedas, y los nuevos paradigmas relacionados con la creación de valor.\n\nAsimismo, vamos a explicar los constructos tecnológicos que posibilitan estos conceptos: micropagos, firmas digitales, inmutabilidad, tokens no fungibles, el sistema de archivos interplanetario, minería, y comunicación de campo cercano, entre otros.\n\nSobre Blockchain en las Artes\n\nBlockchain en las Artes es una serie de cuatro encuentros realizados en alianza con CKWEB (https://ckweb.gov.co) y el artista argentino Guido Corallo. Su objetivo es crear un diálogo entre artistas, desarrolladores/as de software y otras profesiones en torno al impacto de la tecnología blockchain en el arte. Cada encuentro tendrá un/a invitado/a especial que nos brindará su perspectiva sobre el tema. Buscamos que personas de diferentes perfiles interactúen entre sí, se conozcan, y hagan proyectos juntos/as.\n\nSobre CKWeb\n\nCKWEB es una estación audiovisual experimental de la Línea de Arte, Ciencia y Tecnología del Idartes que promueve la investigación, experimentación, formación, debate y difusión de contenidos culturales. Propicia el diálogo transdisciplinar, el desarrollo de redes y el intercambio abierto entre diferentes agentes del campo artístico, cultural y la ciudadanía en general.\n\nSobre Coinosis\n\nEn la era de internet, la educación necesita un nuevo paradigma.\n\nAsí como el costo de un semestre universitario aumenta constantemente, la calidad del contenido educativo gratuito en internet también lo hace, creando una brecha cada vez mayor entre dos tipos de aprendizaje aparentemente excluyentes. Si muchas personas están todavía dispuestas a pagar un semestre, es porque reconocen el valor de la interacción en persona; por otro lado, aunque cada vez recurren más a internet para complementar su aprendizaje, les cuesta la idea de remunerar a quienes crean estos contenidos. ¿Cómo reducir la brecha entre estos dos modelos de aprendizaje?\n\nCoinosis busca ser una plataforma de aprendizaje con teleconferencias donde el dinero fluye de manera democrática desde quienes adquieren conocimiento hacia quienes lo imparten, sin definir roles ni respetar jerarquías, dando cuenta del hecho de que el conocimiento nunca fluye en una sola dirección. Este sistema enriquece los ambientes de aprendizaje creando incentivos para que personas expertas participen en las charlas y reciban una remuneración justa.\n\nSobre nuestro sistema de remuneración\n\n1. Cualquier persona propone una nueva charla.\n2. Para inscribirse, los participantes aportan una suma de dinero.\n3. Este dinero se almacena en un contrato inteligente en la blockchain de Ethereum, que nadie, ni siquiera los creadores, pueden modificar.\n4. Durante la charla, todos participan y todos evalúan la participación de los demás.\n5. Al finalizar la charla se consolidan las calificaciones y se envían al contrato inteligente.\n6. El contrato inteligente distribuye el dinero entre los participantes en cantidades proporcionales al reconocimiento por el conocimiento aportado a la discusión.\n7. Quienes impartieron más conocimiento reciben más dinero, mientras que quienes adquirieron más conocimiento aportan más dinero.\n\nNota: para esta serie de eventos, CKWeb financia los aportes, de manera que los participantes recibirán una suma de dinero correspondiente a su participación, pero no tendrán que hacer ningún aporte.'

const attendees3 = [
	"0xfE1d177037DF1ABbdde4c0E4AFcdE9447F8511D0",
	"0xeFaC568c637201ea0A944b888b8FB98386eF2882",
	"0x608C83b5A91A4cDE4DABBae1505F3ED9AcE0d5B0",
	"0x3355A7BA8344331f40e2E6576868035023c89076",
	"0xA91f6274d2468C501a6C4D1562CF22f96f50f479",
	"0x14dD7616c5743dE0846c128b9e7c854ec05994bC",
	"0x6928bfb114D228dffa0604f990D4A964bF1b6e61",
	"0x134E15eaFFb88f0c0D66023eDFF98bb4aC4e446b",
	"0x7222127CBBcaa8a884f91137B836746eBECeF9Bf",
	"0x82732eCa78474A772799b341100098F05464c401",
	"0xD9d2bF7d69142006c7f8BeeB1ae6d8593a19F8c0",
	"0x70fAA75bF81e700b2017e94a4f56Ed6f4FA286A3",
	"0x87F910E46F19C7494cE666A2490628A2229C0F03",
	"0x4220f649a55DFd21D98a10E323dEEB3eCC0a6bCc",
	"0xEE691b4CDEE70a783dF23DCd638C7D2138fbAc13",
	"0xc31678406506BD99b2F0C99aF602b1EC061aA983",
	"0x7E008dFbd9A71521f5EBAd782de52D0d0C0D25C4",
	"0x230E99c24C53B51Fc41C134262C69805E87Dd20D",
	"0x5027323B073841Dfb6481F2a2AFf38c1f393B9fb",
	"0xeA262ad11EE40e3749De83e3D9031c2BA8C0E0c2",
	"0x647Bf884F82dE1eC472802cE45DcAE8e2b7Cf819",
	"0xCa257b568b18d5Aec9fcF34A18cD8296D1a10D82",
	"0x9EAc87bD86E85Ba04a4fAe1F727b5628186fDb48",
	"0x235264C37a5ea4f9d36e1fE2F614Da340128Ddd8",
	"0x3F6b56c105873f1E03d2e50b46c6d6aD1e06ee5C",
	"0x7a3369863B61c5179Cf0dd9518898c70D3F1a1Df",
	"0x769509097b5F7EdDC9228180B32b462F2aa4fb0b",
	"0xc005BC722F35d12C9ed02492BCd754CFAbe64c71",
	"0x4914CC559057F978dba0D590944C561474B8CaDF",
	"0x565C0145A1A998a7f41e8180831F07422Fd75d0f",
	"0x6Ef0b7d9D76184Fa16B3bDcdb9A9d20B8D75Dd66",
	"0xfaBB4120cb08de21DB9c5DbA250DE4587310Ff8a",
	"0x71dA0F3C580630C9D805A6cbDFdD8E1EB224C2B5",
	"0x46A41ADcFD5F08630a346AA1399BA95454d77231",
	"0x5B0cC29673eb1332b15205888F526de24A7a6586",
	"0xd1eAdcCaC1272d915abEC8135D93794829e95C01",
	"0xfb2B8Df12FDeC301406958138ded018cD1c933e0",
	"0x0c8074D270d347a9B30D52b061881ecCCB53d376",
	"0x41Ca0FF98Ba7fF279A5Bc7621614cdBc4695968E",
	"0x01c21acdD993aD4562a1B4748Fa0F15A6a65Cafe",
	"0x35C1eB1818162C516C54F8a651B616e97cC2b785",
	"0xBc8Ddd9bba3433f94be9f90cf1B464EBD63b0dc8",
	"0x9fcAe58816Ef491E25ab73b70492AED501722E54",
	"0xe675Ca5Df4eC248c41dF084252911Ab284e65Df8",
	"0x0af6fdF5936B40A8A5d7193EcD96134329ABB5C5",
	"0x654Ea831CEA5592662Ab637AAf99999bee0566a9",
];

const event3 = {
  name: 'Introducción a la blockchain para artistas - Blockchain en las Artes 1 de 4',
  url: 'introduccion-a-la-blockchain-para-artistas',
  description: description3,
  fee: 0,
  start: ISODate('2020-04-23T21:00:00Z'),
  end: ISODate('2020-04-30T23:00:00Z'),
  organizer: '0xeFaC568c637201ea0A944b888b8FB98386eF2882',
  attendees: attendees3,
  creation: new Date(),
  afterEnd: ISODate('2020-04-23T23:00:00Z'),
  beforeStart: ISODate('2020-04-23T21:00:00Z'),
  version: 0
};

db.events.insertOne(event3);

const description2 = 'Invitamos a Otto García para que nos hable de su experiencia con la comunidad blockchain y nos dé consejos de cómo empezar a involucrarnos con la misma.\n\nOtto García es un desarrollador blockchain de Valencia, España, con más de seis años de experiencia en la industria. En el 2013 abandonó sus estudios de Ingeniería Aeroespacial en la Universidad Politécnica de Valencia para dedicarse a la investigación de Bitcoin; co-fundó forobits.com y es co-organizador del meetup de Ethereum más importante de España, así como profesor del Msc de Blockchain de la Universidad de Alcalá de Henares en Madrid. Ha hecho una multitud de emprendimientos con diferentes blockchains en distintos campos, incluyendo minería, algoritmos de prueba de trabajo, programas de educación en blockchain, y desarrollo de dapps. Actualmente trabaja como desarrollador blockchain en Autark, una empresa que hace herramientas de colaboración basadas en blockchain, de la cual es co-fundador.\n\nNuestro sistema de incentivos para compartir el conocimiento\n\nQueremos recompensar a todos los participantes que aporten elementos valiosos a la charla. Para eso, vamos a adoptar el siguiente sistema:\n\n1. Todos los participantes deben aportar una suma de 5 dólares que pueden pagar con criptomonedas, PSE o tarjetas de crédito.\n\n2. Durante la teleconferencia, la idea es que todos participen y aporten cosas valiosas.\n\n3. Al final de la charla, todos los participantes van a evaluarse entre sí a través de una hoja de cálculo de Google Sheets.\n\n4. El dinero aportado en el paso 1 se redistribuirá en forma de ether (una criptomoneda) a todos los participantes en una cantidad proporcional a la evaluación recibida.';

const attendees2 = ['0xfE1d177037DF1ABbdde4c0E4AFcdE9447F8511D0', '0xeFaC568c637201ea0A944b888b8FB98386eF2882', '0xa0e2e9AE686c365ab3520BF52E39a55a1673D4d9', '0x923CCA586e629528E45D3ceB3f6DA0963Cd44E0c', '0x134E15eaFFb88f0c0D66023eDFF98bb4aC4e446b', '0xbED9793fC4FEe638805464A16c11ef642e16974D', '0xfc16921c664a8f69c4f63597ff72f8396e3ae989', '0xD59d7F5D821870F212cB57ae3c0cb478b12a59B8'];

const event2 = {
  name: 'Cómo involucrarse en la comunidad blockchain: charla con Otto García',
  url: 'como-involucrarse-en-la-comunidad-blockchain',
  description: description2,
  fee: 5,
  start: ISODate('2020-04-10T19:00:00Z'),
  end: ISODate('2020-04-10T20:30:00Z'),
  organizer: '0xeFaC568c637201ea0A944b888b8FB98386eF2882',
  attendees: attendees2,
  creation: new Date(),
  afterEnd: ISODate('2020-04-10T20:30:00Z'),
  beforeStart: ISODate('2020-04-10T19:00:00Z'),
  version: 0,
};

db.events.insertOne(event2);

const description1 = 'Hola, como hemos hablado, a Emilio Silva y a mí nos gustaría hacer una charla mañana viernes 27 a las 5:00pm sobre Blockchain.\n\nQueremos cumplir dos objetivos:\n1. Conocer sus intereses a la hora de aprender sobre esta tecnología.\n2. Hacer una introducción al tema.\n\nLes propondremos una nueva forma de hacer una charla. Queremos dar ejemplos de implementaciones de la blockchain. Así que la idea es recoger un aporte voluntario que después se repartirá entre los participantes usando un smart contract.\n\nDe esta manera, al final de la sesión saldrán con nuevo conocimiento 🧠 y una billetera virtual con criptomonedas 🤑.';

const attendees1 = ['0xc145d0874d73d5E503D9850b974bE0a1072fC8a3', '0xa0e2e9AE686c365ab3520BF52E39a55a1673D4d9', '0xbED9793fC4FEe638805464A16c11ef642e16974D', '0xfE1d177037DF1ABbdde4c0E4AFcdE9447F8511D0', '0xeFaC568c637201ea0A944b888b8FB98386eF2882', '0x69Fd2AafdE06DCadf46699a76aA5f467bcA1EeEe'];

const event1 = {
  name: 'Introducción a la Blockchain',
  url: 'introduccion-a-la-blockchain',
  description: description1,
  fee: 5,
  start: ISODate('2020-03-27T22:00:00Z'),
  end: ISODate('2020-03-27T23:40:00Z'),
  organizer: '0xeFaC568c637201ea0A944b888b8FB98386eF2882',
  attendees: attendees1,
  creation: new Date(),
  afterEnd: ISODate('2020-03-27T23:40:00Z'),
  beforeStart: ISODate('2020-04-10T19:00:00Z'),
  version: 0,
};

db.events.insertOne(event1);
