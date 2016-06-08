import {Component} from "@angular/core";
import {NavController, Toast, Alert, Loading, Platform} from 'ionic-angular';
import {SocialSharing} from 'ionic-native';
import {HTTP_PROVIDERS} from "@angular/http";

import {AuthProvider} from "../../providers/auth-provider/auth-provider";
import {Track} from "../../interfaces/track";
import {ImagePipe} from "../../pipes/ImagePipe";
import {Player} from "../../interfaces/player";

declare var SC: any;

/*
  Generated class for the LikedPage page.

  See http://ionicframework.com/docs/v2/components/#navigation for more info on
  Ionic pages and navigation.
*/

@Component({
  templateUrl: 'build/pages/liked/liked.html',
  providers: [AuthProvider, HTTP_PROVIDERS],
  pipes: [ImagePipe]
})
export class LikedPage {

  public songs: Track[];
  public mainPlayer: Player;
  private loading: Loading;
  private toast: Toast;
  public loggedIn: boolean;
  public isMD: boolean;

  ionViewLoaded() {
    if (this.platform.is("android")) {
      this.isMD = true;
    }
    else {
      this.isMD = false;
    }
  }

  ionViewDidEnter() {

    if (this.authProvider.getToken() === null) {
      let prompt = Alert.create({
        title: 'Not logged in',
        message: "You must be logged in to see your liked songs. Would you like to log in now?",
        buttons: [
          {
            text: 'No',
            handler: data => {

            }
          },
          {
            text: 'Yes',
            handler: data => {
              this.authProvider.login().then((result) => {
                prompt.dismiss().then(() => {
                  this.loggedIn = true;
                  this.getLikedSongs();
                })
              }).catch((err) => {
                let alert = Alert.create({
                  title: "Not logged in",
                  message: `${err}`,
                  buttons: ["OK"]
                })
                this.nav.present(alert);
              })
            }
          }
        ]
      });

      this.nav.present(prompt);
    }
    else {
      this.getLikedSongs();
    }

  }
  constructor(private nav: NavController, private authProvider: AuthProvider, private platform: Platform) { }

  private getLikedSongs() {
    let loading = Loading.create({
      content: "Getting songs..."
    });

    this.nav.present(loading).then(() => {
      this.authProvider.getLiked()
        .subscribe(
        data => {
          this.songs = data;
          loading.dismiss();
        },
        error => {
          alert(error);
        }
        )
    });
  }

  private load(id: string, songName: string, duration: number): Promise<any> {

    if (this.toast !== undefined && this.toast._destroys.length === 1) {
      return new Promise((resolve, reject) => {
        this.toast.setMessage(`Playing ${songName}`)

        SC.stream(`/tracks/${id}`).then((player) => {
          //player.play();
          resolve(this.mainPlayer = player);

          this.toast.onDismiss(() => {
            this.pause();
          })

          //set up events
          player.on("finish", () => {
            this.toast.dismiss().then(() => {
              //hacky workaround
              this.toast.dismiss();

              this.songDone();
            })
          });

          player.on("audio_error", () => {
            this.audioError();
          });
          player.on("no_connection", () => {
            this.audioError();
          });
          player.on("no_streams", () => {
            this.audioError();
          });
        });
      })

    }
    else {
      return new Promise((resolve, reject) => {
        SC.stream(`/tracks/${id}`, {
          useHTML5Audio: true,
          preferFlash: false
        }).then((player) => {
          console.log(player);
          //player.play();
          resolve(this.mainPlayer = player);

          this.toast = Toast.create({
            message: `Playing ${songName}`,
            showCloseButton: true,
            closeButtonText: "stop",
            dismissOnPageChange: false
          });

          this.toast.onDismiss(() => {
            this.pause();
          })

          //set up events
          player.on("finish", () => {
            this.toast.dismiss().then(() => {
              //hacky workaround
              this.toast.dismiss();

              this.songDone();
            })
          });

          player.on("audio_error", () => {
            this.audioError();
          });
          player.on("no_connection", () => {
            this.audioError();
          });
          player.on("no_streams", () => {
            this.audioError();
          });

        });
      });
    }

  }

  public play(id: string, songName: string, duration: number): void {
    let loading = Loading.create({
      content: "Buffering..."
    });
    this.nav.present(loading).then(() => {
      this.load(id, songName, duration).then((song) => {
        song.play();
        setTimeout(() => {
          loading.dismiss();
        }, 700)
      })

    })
  }

  public pause(): void {
    this.mainPlayer.pause();
  }

  private songDone(): void {
    let confirm = Alert.create({
      title: 'Song finished',
      message: 'Would you like to play a similar song?',
      buttons: [
        {
          text: 'No',
          handler: () => {
            console.log('Disagree clicked');
          }
        },
        {
          text: 'Yes',
          handler: () => {
            console.log(this.songs);
            const randNum: number = Math.floor((Math.random() * 9) + 0);
            console.log(randNum);

            this.play(
              this.songs[randNum].id,
              this.songs[randNum].title,
              this.songs[randNum].duration
            );

          }
        }
      ]
    });

    this.nav.present(confirm);
  }
  
  public share(songUrl: string) {
    SocialSharing.share("Check out what im listening too!", null, null, songUrl);
  }

  private audioError(): void {
    let alert = Alert.create({
      title: 'Error',
      subTitle: 'There was an error getting this song',
      buttons: ['OK']
    });
    this.nav.present(alert);
  }
}
