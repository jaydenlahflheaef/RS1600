const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// Creates an assignment only if the calling tutor has a claimed session for the tutee.
// Resolution chain: sessions.assignedTutorId → sessions.studentName → members.email → users.uid
exports.createAssignment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in.');
  }

  const tutorUid = request.auth.uid;
  const { tuteeUid, tuteeEmail, title, description, dueDate } = request.data;

  if (!tuteeUid || !title) {
    throw new HttpsError('invalid-argument', 'tuteeUid and title are required.');
  }

  // Step 1: get all sessions claimed by this tutor
  const sessSnap = await db.collection('sessions')
    .where('assignedTutorId', '==', tutorUid)
    .get();

  if (sessSnap.empty) {
    throw new HttpsError('permission-denied', 'You have no claimed sessions.');
  }

  const studentNames = [...new Set(
    sessSnap.docs.map(d => d.data().studentName).filter(Boolean)
  )];

  // Step 2: resolve each student name → uid and check against tuteeUid
  let authorized = false;
  for (const name of studentNames) {
    const mSnap = await db.collection('members')
      .where('name', '==', name)
      .limit(1)
      .get();
    if (mSnap.empty) continue;

    const email = mSnap.docs[0].data().email;
    if (!email) continue;

    const uSnap = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    if (uSnap.empty) continue;

    if (uSnap.docs[0].id === tuteeUid) {
      authorized = true;
      break;
    }
  }

  if (!authorized) {
    throw new HttpsError('permission-denied', 'This student is not assigned to you.');
  }

  await db.collection('assignments').add({
    tuteeUid,
    tuteeEmail: tuteeEmail || '',
    title,
    tutorUid,
    description: description || '',
    dueDate: dueDate || '',
    completed: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
