/* eslint-disable camelcase */
const { db } = require('./firebase')

const getPatientTemplate = ({ email, nombre, apellido, role, active, documento, telefono, edad, ocupacion, direccion, nombre_acudiente, telefono_acudiente, ultimo_control, image }) => {
  return {
    email,
    nombre,
    apellido,
    role,
    telefono,
    edad,
    ocupacion,
    direccion,
    nombre_acudiente: nombre_acudiente || null,
    telefono_acudiente: telefono_acudiente || null,
    ultimo_control,
    image: image ?? null,
    documento: documento ?? '',
    active: active ?? true,
    deberes: {
      preferencial: false,
      contraste: false
    },
    medico_asignado: null,
    passwordSetted: false
  }
}
const getDoctorTemplate = ({
  email,
  role,
  nombre,
  apellido,
  image,
  documento,
  telefono
}) => {
  return {
    email,
    nombre,
    apellido,
    role,
    telefono,
    documento: documento || null,
    image: image || null,
    active: true,
    pacientes_asignados: []
  }
}
const getAdminTemplate = ({
  email,
  role,
  nombre,
  apellido,
  image
}) => ({
  email,
  role,
  nombre,
  apellido,
  active: true,
  image: image || null
})

const validateBody = (body) => {
  const role = body?.role
  if (!role) throw new Error('Not valid')
  if (!body.password) throw new Error('Falta contraseña')

  if (role === 'admin') {
    if (!body.email || !body.role || !body.nombre || !body.apellido) throw new Error('Faltan datos para crear el admin.')
  } else if (role === 'doctor') {
    console.log(body.telefono)
    if (!body.email || !body.role || !body.nombre || !body.apellido || !body.telefono) throw new Error('Faltan datos para crear el médico.')
  } else {
    if (!body.email || !body.password || !body.nombre || !body.apellido || !body.role || !body.telefono || !body.edad || !body.direccion) throw new Error('Faltan datos para crear el paciente.')
    if (body.edad <= 15 && (!body.nombre_acudiente || !body.telefono_acudiente)) throw new Error('El usuario es menor de 16 años pero no tiene nombre o telefono de acudiente.')
  }
}

module.exports = {
  async getUserByEmail (collection, email) {
    return db.collection(collection).where('email', '==', email).limit(1).get()
      .then(docs => {
        if (docs.empty) return false
        const parsedDocs = docs.docs

        return parsedDocs[0].data()
      })
      .catch((err) => {
        console.log(err)
        return false
      })
  },
  getDoctorTemplate,
  getPatientTemplate,
  getAdminTemplate,
  validateBody
}
