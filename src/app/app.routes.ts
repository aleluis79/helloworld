import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'pedido/create', loadComponent: () => import('./pages/crear-pedido/crear-pedido.component')
  }
];
