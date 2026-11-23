const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

exports.alterarEmailUsuario = onCall({ region: "southamerica-east1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Faça login para continuar.");

  const adminUid = request.auth.uid;
  const adminDoc = await db.collection("usuarios").doc(adminUid).get();
  if (!adminDoc.exists || adminDoc.data().perfil !== "administrador") {
    throw new HttpsError("permission-denied", "Somente administradores podem alterar e-mails.");
  }

  const uid = String(request.data?.uid || "").trim();
  const novoEmail = String(request.data?.novoEmail || "").trim().toLowerCase();
  if (!uid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novoEmail)) {
    throw new HttpsError("invalid-argument", "UID ou novo e-mail inválido.");
  }
  if (uid === adminUid && request.auth.token.email === novoEmail) {
    throw new HttpsError("invalid-argument", "O e-mail informado é igual ao atual.");
  }

  const targetRef = db.collection("usuarios").doc(uid);
  const targetDoc = await targetRef.get();
  if (!targetDoc.exists) throw new HttpsError("not-found", "Usuário não encontrado no Firestore.");

  const targetData = targetDoc.data();
  const oldEmail = targetData.email || "";
  if (oldEmail.toLowerCase() === novoEmail) {
    throw new HttpsError("already-exists", "O novo e-mail é igual ao e-mail atual.");
  }

  let authUser;
  try {
    authUser = await getAuth().getUser(uid);
  } catch (error) {
    throw new HttpsError("not-found", "Conta não encontrada no Firebase Authentication.");
  }

  try {
    await getAuth().updateUser(uid, { email: novoEmail, emailVerified: false });
    await targetRef.update({ email: novoEmail });
    await db.collection("auditoria_usuarios").add({
      tipo: "alteracao_email",
      usuarioUid: uid,
      usuarioNome: targetData.nome || "",
      emailAnterior: oldEmail || authUser.email || "",
      emailNovo: novoEmail,
      administradorUid: adminUid,
      administradorNome: adminDoc.data().nome || request.auth.token.name || request.auth.token.email || "",
      dataAlteracao: FieldValue.serverTimestamp()
    });
  } catch (error) {
    // Se a atualização do Firestore/auditoria falhar após o Auth, tenta restaurar o e-mail anterior.
    try {
      if (authUser.email) await getAuth().updateUser(uid, { email: authUser.email, emailVerified: authUser.emailVerified });
      await targetRef.update({ email: oldEmail || authUser.email || "" });
    } catch (rollbackError) {
      console.error("Falha no rollback da alteração de e-mail", rollbackError);
    }
    console.error("alterarEmailUsuario", error);
    throw new HttpsError("internal", "Não foi possível concluir a alteração. O sistema tentou reverter a operação.");
  }

  return { success: true, message: `E-mail de ${targetData.nome || oldEmail || uid} alterado com sucesso.` };
});
