const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

// Creates an assignment only if the tutee has a booking with this tutor.
exports.createAssignment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be logged in.');
  }

  const tutorUid = request.auth.uid;
  const { tuteeUid, tuteeEmail, tuteeName, title, description, dueDate } = request.data;

  if (!tuteeUid || !title) {
    throw new HttpsError('invalid-argument', 'tuteeUid and title are required.');
  }

  // Verify this tutee has a booking with this tutor
  const bookingSnap = await db.collection('bookings')
    .where('tuteeUid', '==', tuteeUid)
    .where('tutorUid', '==', tutorUid)
    .limit(1)
    .get();

  if (bookingSnap.empty) {
    throw new HttpsError('permission-denied', 'This student has not booked sessions with you.');
  }

  await db.collection('assignments').add({
    tuteeUid,
    tuteeEmail: tuteeEmail || '',
    tuteeName: tuteeName || '',
    title,
    tutorUid,
    description: description || '',
    dueDate: dueDate || '',
    completed: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});
