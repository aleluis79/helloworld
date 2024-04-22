import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { NavigationComponent } from "./navigation/navigation.component";

@Component({
    selector: 'app-root',
    standalone: true,
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [MatButtonModule, NavigationComponent]
})
export class AppComponent {
  title = 'helloworld';
  constructor() {
    console.log(this.title)
  }
}
