export class AuthService {
  constructor(client) { this.auth=client.auth; }
  redirect() { return new URL('./',location.href).href; }
  async signIn(email,password) { const {data,error}=await this.auth.signInWithPassword({email,password});if(error)throw error;return data; }
  async signUp(email,password) { const {data,error}=await this.auth.signUp({email,password,options:{emailRedirectTo:this.redirect()}});if(error)throw error;return data; }
  async recover(email) { const {error}=await this.auth.resetPasswordForEmail(email,{redirectTo:this.redirect()});if(error)throw error; }
  async updatePassword(password) { const {error}=await this.auth.updateUser({password});if(error)throw error; }
  async signOut() {
    try { const {error}=await this.auth.signOut({scope:'local'});if(error)throw error; }
    finally {
      // Even an offline logout must not restore this user's data on reload.
      try { for(const key of ['cozy-bank-auth-v1','cozy-bank-auth-v1-user','cozy-bank-auth-v1-code-verifier'])localStorage.removeItem(key); } catch {}
    }
  }
}
