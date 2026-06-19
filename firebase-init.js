// AfroEduLink - Firebase Data Layer (Secured)
firebase.initializeApp({
  apiKey:"AIzaSyD-ZZFRkeldSPlsRs6UqIylwNfaojWTZTc",
  authDomain:"tilawah-link-academy.firebaseapp.com",
  projectId:"tilawah-link-academy",
  storageBucket:"tilawah-link-academy.firebasestorage.app",
  messagingSenderId:"924154130867",
  appId:"1:924154130867:web:61d9e3009d619067dc9bc6"
});
var db = firebase.firestore();
var storage = firebase.storage();
var auth = firebase.auth();

// ===== SESSION =====
function getSession(){try{return JSON.parse(localStorage.getItem('ael_session'));}catch(e){return null;}}
function setSession(u){
  // Ne jamais stocker le mot de passe dans la session
  var safe = Object.assign({}, u);
  delete safe.password;
  localStorage.setItem('ael_session', JSON.stringify(safe));
}
function clearSession(){localStorage.removeItem('ael_session');}

// ===== SÉCURITÉ : HACHAGE DE MOT DE PASSE =====
var HASH_SALT = 'TLA_SECURE_2024_SALT';

async function hashPassword(password) {
  var encoder = new TextEncoder();
  var data = encoder.encode(password + HASH_SALT);
  var hashBuffer = await crypto.subtle.digest('SHA-256', data);
  var hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

// Vérifie si un mot de passe est déjà haché (64 caractères hexadécimaux)
function isHashed(password) {
  return typeof password === 'string' && password.length === 64 && /^[0-9a-f]+$/.test(password);
}

// ===== FIREBASE AUTH =====
async function fbAuthSignIn() {
  try {
    if (!auth.currentUser) {
      await auth.signInAnonymously();
    }
  } catch(e) {
    console.error('Firebase Auth sign-in error:', e);
    if (e.code === 'auth/operation-not-allowed') {
      throw new Error("L'authentification anonyme n'est pas activée. Allez dans Firebase Console → Authentication → Sign-in method → Anonymous → Activer.");
    }
    throw new Error("Erreur d'authentification Firebase: " + e.message);
  }
}

async function fbAuthSignOut() {
  try {
    await auth.signOut();
  } catch(e) {
    console.warn('Firebase Auth sign-out error:', e);
  }
}

// Attendre que Firebase Auth soit prêt
function fbAuthReady() {
  return new Promise(function(resolve) {
    var unsubscribe = auth.onAuthStateChanged(function(user) {
      unsubscribe();
      resolve(user);
    });
  });
}

// ===== CATEGORIES =====
var CATEGORIES = {
  'Sciences':{icon:'fa-flask',color:'#4CAF50',disciplines:['Mathématiques','Physique','Chimie','Biologie','SVT']},
  'Langues':{icon:'fa-language',color:'#2196F3',disciplines:['Français','Anglais','Arabe','Espagnol','Allemand','Wolof']},
  'Informatique':{icon:'fa-laptop-code',color:'#7C3AED',disciplines:['Programmation','Développement Web','Data Science','Intelligence Artificielle','Bureautique']},
  'Business':{icon:'fa-briefcase',color:'#F59E0B',disciplines:['Marketing','Comptabilité','Finance','Management','Entrepreneuriat']},
  'Arts':{icon:'fa-palette',color:'#EC4899',disciplines:['Dessin','Musique','Photographie','Design Graphique','Montage Vidéo']},
  'Religion':{icon:'fa-mosque',color:'#06B6D4',disciplines:['Coran','Tajwid','Mémorisation (Hifz)','Sciences Islamiques','Fiqh']},
  'Développement Personnel':{icon:'fa-brain',color:'#F97316',disciplines:['Communication','Leadership','Productivité','Coaching','Prise de parole']},
  'Soutien Scolaire':{icon:'fa-graduation-cap',color:'#6366F1',disciplines:['Primaire','Collège','Lycée','Préparation BAC','Concours','Aide aux devoirs']}
};

// ===== USERS =====
async function fbGetAllUsers(){
  var snap=await db.collection('users').get();
  var arr=[];snap.forEach(function(d){arr.push(d.data());});return arr;
}
async function fbGetUser(uid){
  var doc=await db.collection('users').doc(uid).get();
  return doc.exists?doc.data():null;
}
async function fbSetUser(uid,data){
  await db.collection('users').doc(uid).set(data,{merge:true});
}
async function fbDeleteUser(uid){
  await db.collection('users').doc(uid).delete();
}
async function fbFindByPhone(phone){
  var snap=await db.collection('users').where('phone','==',phone).get();
  if(snap.empty)return null;
  var r=null;snap.forEach(function(d){r=d.data();});return r;
}

// LOGIN SÉCURISÉ : comparaison par hash + migration automatique des mots de passe en clair
async function fbFindByLogin(id, pass) {
  try {
    var hashedPass = await hashPassword(pass);

    // Chercher par téléphone
    var snap = await db.collection('users').where('phone', '==', id).get();
    if (!snap.empty) {
      var user = null;
      var needsMigration = false;
      snap.forEach(function(d) {
        var u = d.data();
        if (u.password === hashedPass) {
          // Mot de passe haché correspond
          user = u;
        } else if (!isHashed(u.password) && u.password === pass) {
          // Ancien mot de passe en clair — migration nécessaire
          user = u;
          needsMigration = true;
        }
      });
      if (user) {
        if (needsMigration) {
          await fbSetUser(user.id, { password: hashedPass });
          user.password = hashedPass;
          console.log('Migration mot de passe effectuée pour:', user.id);
        }
        return user;
      }
    }

    // Chercher par email
    snap = await db.collection('users').where('email', '==', id).get();
    if (!snap.empty) {
      var user = null;
      var needsMigration = false;
      snap.forEach(function(d) {
        var u = d.data();
        if (u.password === hashedPass) {
          user = u;
        } else if (!isHashed(u.password) && u.password === pass) {
          user = u;
          needsMigration = true;
        }
      });
      if (user) {
        if (needsMigration) {
          await fbSetUser(user.id, { password: hashedPass });
          user.password = hashedPass;
          console.log('Migration mot de passe effectuée pour:', user.id);
        }
        return user;
      }
    }

    return null;
  } catch(e) {
    console.error('Login error:', e);
    return null;
  }
}

// ===== MEDIA =====
async function fbGetAllMedia(){
  var snap=await db.collection('media').get();
  var arr=[];snap.forEach(function(d){arr.push(d.data());});return arr;
}
async function fbAddMedia(mid,data){await db.collection('media').doc(mid).set(data);}
async function fbDeleteMedia(mid){await db.collection('media').doc(mid).delete();}

// ===== STORAGE =====
async function fbUploadToStorage(path,file){
  var ref=storage.ref().child(path);
  await ref.put(file);
  return await ref.getDownloadURL();
}
async function fbDeleteFromStorage(path){
  try{await storage.ref().child(path).delete();}catch(e){console.log('Storage delete:',e);}
}
// Legacy compat
async function fbUploadFile(mid,file){
  try{
    var url=await fbUploadToStorage('media/'+mid,file);
    return url;
  }catch(e){
    return new Promise(function(resolve){
      var reader=new FileReader();
      reader.onload=function(ev){resolve(ev.target.result);};
      reader.readAsDataURL(file);
    });
  }
}
async function fbGetFileUrl(mid){
  var doc=await db.collection('media').doc(mid).get();
  if(doc.exists&&doc.data().url)return doc.data().url;return null;
}
async function fbDeleteFile(mid){await fbDeleteFromStorage('media/'+mid);}

// ===== CONVERSATIONS =====
async function fbGetConversations(userId){
  var snap=await db.collection('conversations')
    .where('participants','array-contains',userId).get();
  var arr=[];snap.forEach(function(d){arr.push({id:d.id,...d.data()});});
  arr.sort(function(a,b){
    var ta=a.updatedAt?a.updatedAt.toDate?a.updatedAt.toDate():new Date(a.updatedAt):new Date(0);
    var tb=b.updatedAt?b.updatedAt.toDate?b.updatedAt.toDate():new Date(b.updatedAt):new Date(0);
    return tb-ta;
  });
  return arr;
}
async function fbGetOrCreateConversation(uid1,uid2){
  var snap=await db.collection('conversations')
    .where('participants','array-contains',uid1).get();
  var found=null;
  snap.forEach(function(d){
    var data=d.data();
    if(data.participants.indexOf(uid2)!==-1)found={id:d.id,...data};
  });
  if(found)return found;
  var ref=db.collection('conversations').doc();
  var conv={participants:[uid1,uid2],lastMessage:null,updatedAt:new Date().toISOString(),createdAt:new Date().toISOString(),unread:{}};
  conv.unread[uid1]=0;conv.unread[uid2]=0;
  await ref.set(conv);
  return{id:ref.id,...conv};
}
async function fbSendMessage(convId,msg){
  await db.collection('conversations').doc(convId).collection('messages').add(msg);
  var txt=msg.text||(msg.type==='voice'?'🎤 Message vocal':msg.type==='file'?'📎 Fichier':'💬 Message');
  var upd={lastMessage:{text:txt,senderId:msg.senderId,timestamp:msg.timestamp},updatedAt:new Date().toISOString()};
  upd['unread.'+msg.recipientId]=firebase.firestore.FieldValue.increment(1);
  await db.collection('conversations').doc(convId).update(upd);
}
function fbListenMessages(convId,callback){
  return db.collection('conversations').doc(convId).collection('messages')
    .orderBy('timestamp','asc').onSnapshot(function(snap){
      var msgs=[];snap.forEach(function(d){msgs.push({id:d.id,...d.data()});});
      callback(msgs);
    });
}
function fbListenConversations(userId,callback){
  return db.collection('conversations')
    .where('participants','array-contains',userId)
    .onSnapshot(function(snap){
      var convs=[];snap.forEach(function(d){convs.push({id:d.id,...d.data()});});
      convs.sort(function(a,b){
        var ta=a.updatedAt?new Date(a.updatedAt):new Date(0);
        var tb=b.updatedAt?new Date(b.updatedAt):new Date(0);
        return tb-ta;
      });
      callback(convs);
    });
}
async function fbMarkAsRead(convId,userId){
  var upd={};upd['unread.'+userId]=0;
  await db.collection('conversations').doc(convId).update(upd);
}

// ===== STORIES =====
async function fbCreateStory(data){
  var ref=db.collection('stories').doc();
  data.id=ref.id;await ref.set(data);return data;
}
async function fbGetActiveStories(){
  var now=new Date().toISOString();
  var snap=await db.collection('stories').where('expiresAt','>',now).get();
  var arr=[];snap.forEach(function(d){arr.push(d.data());});
  arr.sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);});
  return arr;
}
async function fbAddStoryView(storyId,userId){
  await db.collection('stories').doc(storyId).update({
    views:firebase.firestore.FieldValue.arrayUnion({userId:userId,timestamp:new Date().toISOString()})
  });
}
async function fbReplyToStory(storyId,reply){
  await db.collection('stories').doc(storyId).update({
    replies:firebase.firestore.FieldValue.arrayUnion(reply)
  });
}
async function fbDeleteStory(storyId){await db.collection('stories').doc(storyId).delete();}
async function fbGetUserStories(userId){
  var now=new Date().toISOString();
  var snap=await db.collection('stories').where('userId','==',userId).get();
  var arr=[];snap.forEach(function(d){var s=d.data();if(s.expiresAt>now)arr.push(s);});
  return arr;
}

// ===== FOLLOW =====
async function fbFollow(followerId,followedId){
  await db.collection('users').doc(followerId).update({following:firebase.firestore.FieldValue.arrayUnion(followedId)});
  await db.collection('users').doc(followedId).update({followers:firebase.firestore.FieldValue.arrayUnion(followerId)});
}
async function fbUnfollow(followerId,followedId){
  await db.collection('users').doc(followerId).update({following:firebase.firestore.FieldValue.arrayRemove(followedId)});
  await db.collection('users').doc(followedId).update({followers:firebase.firestore.FieldValue.arrayRemove(followerId)});
}

// ===== NOTIFICATIONS =====
async function fbAddNotification(userId,notif){
  await db.collection('notifications').add({...notif,userId:userId,read:false,timestamp:new Date().toISOString()});
}
async function fbGetNotifications(userId){
  var snap=await db.collection('notifications').where('userId','==',userId).get();
  var arr=[];snap.forEach(function(d){arr.push({id:d.id,...d.data()});});
  arr.sort(function(a,b){return new Date(b.timestamp)-new Date(a.timestamp);});
  return arr.slice(0,50);
}
async function fbMarkNotifRead(notifId){
  await db.collection('notifications').doc(notifId).update({read:true});
}

// ===== ONLINE STATUS =====
async function fbSetOnlineStatus(userId,isOnline){
  await db.collection('users').doc(userId).update({isOnline:isOnline,lastSeen:new Date().toISOString()});
}

// ===== POSTS =====
async function fbCreatePost(data){
  var ref=db.collection('posts').doc();data.id=ref.id;await ref.set(data);return data;
}
async function fbGetPosts(limit){
  var snap=await db.collection('posts').orderBy('createdAt','desc').limit(limit||50).get();
  var arr=[];snap.forEach(function(d){var p=d.data();p.id=d.id;arr.push(p);});return arr;
}
async function fbGetUserPosts(userId){
  var arr=[];
  try{
    var snap=await db.collection('posts').where('userId','==',userId).orderBy('createdAt','desc').get();
    snap.forEach(function(d){var p=d.data();p.id=d.id;arr.push(p);});
  }catch(e){
    console.warn('fbGetUserPosts index fallback:',e.message);
    var snap2=await db.collection('posts').where('userId','==',userId).get();
    snap2.forEach(function(d){var p=d.data();p.id=d.id;arr.push(p);});
    arr.sort(function(a,b){return (b.createdAt||'').localeCompare(a.createdAt||'');});
  }
  return arr;
}
async function fbDeletePost(postId){await db.collection('posts').doc(postId).delete();}
async function fbLikePost(postId,userId){
  await db.collection('posts').doc(postId).update({likes:firebase.firestore.FieldValue.arrayUnion(userId)});
}
async function fbUnlikePost(postId,userId){
  await db.collection('posts').doc(postId).update({likes:firebase.firestore.FieldValue.arrayRemove(userId)});
}

// ===== COMMENTS =====
async function fbAddComment(postId,comment){
  var ref=db.collection('posts').doc(postId).collection('comments').doc();
  comment.id=ref.id;await ref.set(comment);return comment;
}
async function fbGetComments(postId){
  var snap=await db.collection('posts').doc(postId).collection('comments').orderBy('createdAt','asc').get();
  var arr=[];snap.forEach(function(d){arr.push(d.data());});return arr;
}
async function fbDeleteComment(postId,commentId){
  await db.collection('posts').doc(postId).collection('comments').doc(commentId).delete();
}

// ===== FAVORITES =====
async function fbAddFavorite(userId,item){
  await db.collection('users').doc(userId).collection('favorites').doc(item.id).set(item);
}
async function fbRemoveFavorite(userId,itemId){
  await db.collection('users').doc(userId).collection('favorites').doc(itemId).delete();
}
async function fbGetFavorites(userId){
  var snap=await db.collection('users').doc(userId).collection('favorites').get();
  var arr=[];snap.forEach(function(d){arr.push(d.data());});return arr;
}
async function fbIsFavorite(userId,itemId){
  var doc=await db.collection('users').doc(userId).collection('favorites').doc(itemId).get();
  return doc.exists;
}

// ===== INIT =====
async function initFirebaseDB(){
  // S'authentifier avec Firebase Auth d'abord
  await fbAuthSignIn();

  var admin=await fbGetUser('admin');
  if(!admin){
    // Créer le compte admin avec mot de passe haché
    var hashedAdminPass = await hashPassword('admin');
    await fbSetUser('admin',{id:'admin',role:'admin',roles:['admin'],activeRole:'admin',
      name:'Administrateur',email:'admin@tilawahlink.academy',phone:'admin',password:hashedAdminPass,
      status:'active',city:'Dakar',categories:[],disciplines:[],publics:[],bio:'',avatar:'',
      followers:[],following:[],isOnline:false,lastSeen:'',createdAt:new Date().toISOString()});
  } else if (!isHashed(admin.password)) {
    // Migrer le mot de passe admin en clair vers un hash
    var hashedAdminPass = await hashPassword(admin.password);
    await fbSetUser('admin', { password: hashedAdminPass });
    console.log('Mot de passe admin migré vers hash.');
  }
}
