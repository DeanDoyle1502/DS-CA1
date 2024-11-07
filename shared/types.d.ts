// export type Language = 'English' | 'Frenc


export type Song = {
  album_name: string,      
  song_title: string,
  artist: string,
  track_length: number,
  genre: string,
  released: number,
}


export type SignUpBody = {
  username: string;
  password: string;
  email: string
}

export type ConfirmSignUpBody = {
  username: string;
  code: string;
}

export type SignInBody = {
  username: string;
  password: string;
}


 