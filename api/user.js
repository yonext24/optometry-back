/* eslint-disable camelcase */
const { getDoctorTemplate, getPatientTemplate, getAdminTemplate, validateBody } = require('../utils')
const { db, auth } = require('../firebase')
// https://clinquant-capybara-57b392.netlify.app
// http://localhost:3000
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', 'https://clinquant-capybara-57b392.netlify.app')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Verificar el método de la solicitud
  if (req.method === 'OPTIONS') {
    // Si es una solicitud OPTIONS, responder con los encabezados CORS y finalizar la función
    return res.status(200).end()
  }

  const token = req.headers.authorization?.split('Bearer ')[1]

  if (!token) {
    // El token no está presente en la solicitud
    return res.status(401).json({ error: 'No estás autorizado para hacer esto.' })
  }

  /*
      ****************************************************************************************

                                            POST

      ****************************************************************************************
    */

  if (req.method === 'POST') {
    const { email, password, nombre, role } = req.body

    console.log(req.body)

    try {
      validateBody(req.body)
    } catch (err) {
      console.log(err)
      const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error al verificar los datos'
      return res.status(400).json({ error: errorMessage })
    }

    try {
      const decodedToken = await auth.verifyIdToken(token)

      const admin = await auth.getUser(decodedToken.uid)
        .then((user) => {
          return user.customClaims.role === 'admin'
        })

      if (!admin) throw new Error('Not admin')
      req.user = decodedToken
    } catch (error) {
      console.error('Error al verificar el token de autenticación:', error.message)
      return res.status(403).json({ message: 'Error al verificar el usuario:' + error.message })
    }

    const collection = role === 'admin'
      ? 'admins'
      : role === 'doctor'
        ? 'doctors'
        : 'patients'

    const template = role === 'admin'
      ? getAdminTemplate({ ...req.body })
      : role === 'doctor'
        ? getDoctorTemplate({ ...req.body })
        : getPatientTemplate({ ...req.body })

    const existsAuth = await auth.getUserByEmail(email).catch(() => false)

    try {
      // Si la cuenta de Auth no existe hay que crearla
      if (!existsAuth) {
        const user = await auth.createUser({
          email,
          emailVerified: false,
          password,
          displayName: nombre
        })
        await auth.setCustomUserClaims(user.uid, { role })

        const docRef = db.collection(collection).doc(user.uid)
        await docRef.set(template)
        const userFromFirestore = await docRef.get()
          .then((doc) => {
            console.log(doc.id)
            return { ...doc.data(), id: doc.id }
          })

        return res.status(200).json(userFromFirestore)
      }

      try {
        const docRef = db.collection(collection).doc(existsAuth.uid)
        await docRef.set(template)
        const userFromFirestore = await docRef.get()
          .then((doc) => {
            return { ...doc.data(), id: doc.id }
          })

        return res.status(200).json(userFromFirestore)
      } catch (err) {
        console.log(err)
        return res.status(404).json({ error: 'Error al crear el usuario.' })
      }
    } catch (err) {
      console.log(err)
      return res.status(404).json({ error: 'Error al crear el usuario' })
    }
    /*
      ****************************************************************************************

                                            PUT

      ****************************************************************************************
    */
  } else if (req.method === 'PUT') {
    const { userToModify, password } = req.body

    const decodedToken = await auth.verifyIdToken(token)

    const allowed = await auth.getUser(decodedToken.uid)
      .then((user) => {
        return user.customClaims.role === 'admin' || user.uid === userToModify
      })
    if (!allowed) return res.status(405).json({ error: 'No tienes permisos.' })

    try {
      await auth.updateUser(userToModify, {
        password
      })
      return res.status(200).end()
    } catch {
      return res.status(405).end()
    }
    /*
      ****************************************************************************************

                                            DELETE

      ****************************************************************************************
    */
  } else if (req.method === 'DELETE') {
    const { userToModify } = req.body

    const decodedToken = await auth.verifyIdToken(token)

    const allowed = await auth.getUser(decodedToken.uid)
      .then((user) => {
        return user.customClaims.role === 'admin'
      })

    if (!allowed) return res.status(405).json({ error: 'No tienes permisos.' })

    const collection = userToModify.role === 'admin'
      ? 'admins'
      : userToModify.role === 'doctor'
        ? 'doctors'
        : 'patients'

    try {
      await db.collection(collection).doc(userToModify.id).delete()
      await auth.deleteUser(userToModify.id)

      return res.status(200).end()
    } catch (err) {
      return res.status(500).end()
    }

    /* ******************************************************************************

                                          PATCH

       ****************************************************************************** */
  }
  if (req.method === 'PATCH') {
    const { email, id } = req.body

    const decodedToken = await auth.verifyIdToken(token)

    const allowed = await auth.getUser(decodedToken.uid)
      .then((user) => {
        return user.customClaims.role === 'admin' || user.uid === id
      })

    if (!allowed) return res.status(405).json({ error: 'No tienes permisos.' })

    try {
      await auth.updateUser(id, { email })

      return res.status(200).end()
    } catch (err) {
      return res.status(500).end()
    }
  }
}
