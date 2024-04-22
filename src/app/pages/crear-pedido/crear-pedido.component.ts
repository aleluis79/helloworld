import { Component, ViewChild, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, Validators, FormBuilder } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

declare global {
  interface Window {
      hwcrypto: any;
  }

  interface Certificado {
    hex: any;
  }

  function hexToPem(hex: string): string;
}

const URL_SERVICIO = 'http://localhost:8080/firmador-api/';

var certificado: Certificado;

var guid: string;

@Component({
  selector: 'app-crear-pedido',
  standalone: true,
  imports: [
    MatButtonModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    JsonPipe
  ],
  templateUrl: './crear-pedido.component.html',
  styleUrl: './crear-pedido.component.scss'
})
export default class CrearPedidoComponent {

  @ViewChild('stepper') stepper!: MatStepper;

  http = inject(HttpClient);

  _formBuilder = inject(FormBuilder)

  isLinear = true;

  firmado = false;

  firstFormGroup = this._formBuilder.group({
    firstCtrl: ['', Validators.required],
  });

  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required],
  });


  async upload() {

    const formData = new FormData();

    // Obtiene el archivo PDF desde la carpeta assets
    const pdfBlob = await this.obtenerArchivoPDF('sample.pdf');

    formData.append("file", pdfBlob, "sample.pdf");

    const options = {
        method: 'POST',
        body: formData,
    };

    fetch(URL_SERVICIO + 'upload', options)
        .then(response => response.text())
        .then((data) => {
            console.log(data);
            guid = data;
            this.sign(data);
        })
        .catch(_ => window.alert('Error de conexión con la API'));

  }

  // Función para obtener el archivo PDF como un blob
  async obtenerArchivoPDF(nombreArchivo: string): Promise<Blob> {
    const rutaPDF = `assets/${nombreArchivo}`;

    // Realiza una solicitud HTTP para obtener el archivo PDF
    const arrayBuffer = await firstValueFrom(this.http.get(rutaPDF, { responseType: 'arraybuffer' }));

    // Crea un blob a partir del array buffer
    return new Blob([arrayBuffer!], { type: 'application/pdf' });
  }

  sign(guid: string) {

    //Configuro hwcrypto

    // Select hash
    var hashtype = 'SHA-256';

    // Set backend
    var backend = "auto";
    // get language
    var lang = "en";

    var fileCount = 1;

    if (!window.hwcrypto.use(backend)) {
        console.log("Selecting backend failed.");
    }

    if (fileCount === 0) {
        window.alert('Seleccione un archivo PDF para firmar');
        return;
    }

    // Hack for use with hwcrypto
    var self = this;

    //Obtengo el certificado
    window.hwcrypto.getCertificate({lang: lang}).then(function(response: any) {

        certificado = response;
        console.log(hexToPem(certificado.hex));

        //Recupero el hash del pdf a firmar

        var url = URL_SERVICIO + 'api/firma/prepararFirma';
        var cantidadesMaximas = [1];
        var sello0 = 'Renglón uno';
        var sello1 = 'Renglón dos';
        var sello2 = 'Renglón tres';
        var sello3 = 'Renglón cuatro';
        var sello4 = 'Renglón cinco';
        var hojaOficial = 'false';
        var paginaNueva = 'false';

        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

        var urlencoded = new URLSearchParams();
        urlencoded.append("certificado", hexToPem(certificado.hex));
        urlencoded.append("filename", guid);
        urlencoded.append("cantMaxima", cantidadesMaximas.join());
        urlencoded.append("sello0", sello0);
        urlencoded.append("sello1", sello1);
        urlencoded.append("sello2", sello2);
        urlencoded.append("sello3", sello3);
        urlencoded.append("sello4", sello4);
        urlencoded.append("hojaOficial", hojaOficial);
        urlencoded.append("paginaNueva", paginaNueva);


        var requestOptions: any = {
            method: 'POST',
            headers: myHeaders,
            body: urlencoded,
            redirect: 'follow'
        };

        fetch(url, requestOptions)
            .then(response => {
                response.text().then(rta => {
                    var hash = rta;

                    if (hash.indexOf("ERROR:") != -1) {
                        window.alert('Un documento no admite más firmas');
                        return;
                    }

                    //console.log('certificado: ', certificado);
                    console.log('hashtype: ' + hashtype);
                    console.log('hash: ' + hash);

                    // Sign
                    window.hwcrypto.sign(certificado, {type: hashtype, hex: hash}, {lang: lang, info: "hashcount=" + fileCount}).then(function(response: any) {

                        var hashFirmado = response.hex.match(/.{1,64}/g).join("");
                        console.log("Generated signature:\n" + hashFirmado);

                        //Firmar el documento con el hash firmado

                        var url = URL_SERVICIO + 'api/firma/estamparFirma';

                        var myHeaders = new Headers();
                        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

                        var urlencoded = new URLSearchParams();
                        urlencoded.append("certificado", hexToPem(certificado.hex));
                        urlencoded.append("filename", guid);
                        urlencoded.append("hashFirmado", hashFirmado);

                        var requestOptions: any = {
                            method: 'POST',
                            headers: myHeaders,
                            body: urlencoded,
                            redirect: 'follow'
                        };

                        fetch(url, requestOptions)
                            .then(response => {
                                response.text().then(base64 => {
                                  console.log(base64);
                                  self.firmado = true;
                                })
                            })
                    }, function(err: any) {
                        console.log("sign() failed: " + err);
                    });

                })

            })
            .then(result => console.log(result))
            .catch(error => console.log('error', error));

    }, function(err: any) {
        console.log("sign(): getCertificate() failed: " + err);
        console.log(err);

        if (err.message == 'no_implementation') {
            window.alert('Falta instalar el plugin y sus drivers');
        }
        if (err.message == 'no_certificates') {
            window.alert('No se encuentra el Token. Verifique que su token esté conectado al USB de su PC y no vencido');
        }
    });
  }

  download() {
    console.log("guid=", guid)
    const url = `${URL_SERVICIO}api/firma/download?filename=${guid}&indice=1`;

    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sample_firmado.pdf';
        a.click();
      });
  }

}
