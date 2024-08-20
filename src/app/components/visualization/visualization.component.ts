import { Component, Input, OnChanges, SimpleChanges, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../../interfaces/project';
import { Image } from '../../interfaces/image';
import { Results } from '../../interfaces/results';
import { OverlayRecognition } from '../../interfaces/overlay_recognition';
import { ProjectService } from '../../services/project.service';
import { ResultsService } from '../../services/results.service';
import { InformationExchangeService } from '../../services/information-exchange.service';
import { Subscription } from 'rxjs';
import { SelectedProjectService } from '../../services/selected-project.service';
import { HttpClient } from '@angular/common/http';

import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { SecurePipe } from '../../pipes/secure.pipe';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs'
import { ChangeOverlaysComponent } from '../change-overlays/change-overlays.component';
import { Overlay } from '@angular/cdk/overlay';
import { over } from 'cypress/types/lodash';
import { ChainResultSet } from '../../interfaces/chain_result_set';
import { ChainResult } from '../../interfaces/chain_result';
import { error } from 'cypress/types/jquery';
import { Detection } from '../../interfaces/detection';



@Component({
  selector: 'app-visualization',
  standalone: true,
  imports: [CommonModule, MatIconModule, SecurePipe, MatListModule, MatButtonModule],
  templateUrl: './visualization.component.html',
  styleUrl: './visualization.component.scss'
})
export class VisualizationComponent implements OnInit, OnDestroy {
  selectedProject?: Project;
  private selectedProjectSubscription = new Subscription();

  private loadImagesSubscription: Subscription;

  constructor(private projectService: ProjectService, private resultsService: ResultsService, private informationExchangeService: InformationExchangeService, private selectedProjectService: SelectedProjectService, public dialog: MatDialog, private http: HttpClient) {
    this.loadImagesSubscription = this.informationExchangeService.executeFunction.subscribe(() => {
      this.images = [];
      this.loadImages();
    });
  }

  images: Image[] = [];
  overlays: OverlayRecognition[] = [];
  responseData?: Results[];
  chainResponseData?: ChainResultSet[];
  imageChainResultSet?: ChainResultSet;
  chainResults?: ChainResult[];

  selectedOverlay?: OverlayRecognition;

  selectedImage?: Image;

  selectImage(image: Image) {
    //this.getOverlaysForCurrentImg(image);
    this.getChainOverlaysForCurrentImg(image);
    this.selectedImage = image;
  }

  selectOverlay(overlay: OverlayRecognition, scroll: Boolean) {
    this.selectedOverlay = overlay;
    if(scroll) document.getElementById(`${overlay.id}`)?.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
  }

  isSelected(overlay: OverlayRecognition) {
    if (this.selectedOverlay)
      return this.selectedOverlay === overlay;
    return false;
  }

  isSelectedImage(image: Image) {
    if (this.selectedImage)
      return this.selectedImage.id == image.id;
    return false;
  }

  ngOnInit() {
    this.selectedProjectSubscription = this.selectedProjectService.getSelectedProject().subscribe(project => {
      this.selectedProject = project;
      this.loadImages();
      this.overlays = [];
    });

    this.loadImages();
  }


  ngOnDestroy() {
    this.selectedProjectSubscription.unsubscribe();
    this.loadImagesSubscription.unsubscribe();
  }

  //Gets images from server.
  loadImages(): void {
    if (this.selectedProject && this.selectedProject.id !== undefined) {
      this.projectService.getImages(this.selectedProject.id).pipe(
        tap(data => {
          this.images = data;
        }),
        catchError(error => {
          // Fehlerbehandlung
          console.error(error);
          return of([]);
        })
      ).subscribe();

      // this.getResults();
      this.getChainResults();

    } else {
      console.error('Selected project is undefined (loadImages)');
    }
    this.selectedImage = undefined;
    this.reloadGallery();
  }

  //Gets Overlays from server. 
  getResults() {
    if (this.selectedProject) {
      this.resultsService.getOverlays(this.selectedProject.id).pipe(
        tap(response => {
          if (response) {
            this.responseData = response;
          }
        }),
        catchError(error => {
          console.error("Could not get Overlays", error);
          return of(null);
        })
      ).subscribe();
    }
  }

  getChainResults() {
    if (this.selectedProject) {
      console.log("getting chain results");
      this.resultsService.getChainOverlays(this.selectedProject.id).pipe(
        tap(response => {
          console.log(response);
          if (response) {
            // console.log(response);
            this.chainResponseData = response;
            // console.log(this.chainResponseData);
          }
        }),
        catchError(error => {
          console.error("Could not get Overlays", error);
          return of(null);
        })
      ).subscribe();
    }
  }

  getChainOverlaysForCurrentImg(image: Image) {
    console.log("getting overlays");
    console.log(this.chainResponseData);
    if (this.chainResponseData) {
      let index = -1;
      for (let i = 0; i < this.chainResponseData.length; i++) {
        if (image.id == this.chainResponseData[i].image_id) {
          index = i;
        }
      }

      if (index == -1) {
        this.overlays = [];
        console.log("index -1");
        return;
      }

      this.chainResults = Object.values(this.chainResponseData[index].results);

      console.log("this.chainResults");
      console.log(this.chainResults);


      let last_result_of_chain = this.chainResults?.[this.chainResults.length - 1].result;
      this.selectChainResultForOverlays(last_result_of_chain);

    }
    else console.log("no response data");
  }

  selectChainResultForOverlays(detection_element: { [key: string]: Detection; }) {
    if (this.chainResults) {
      console.log(detection_element);
      if (detection_element) {
        const result_keys = Object.keys(detection_element);

        if (result_keys.length > 0) {
          const firstKey = result_keys[0];
          this.overlays = detection_element[firstKey].elements;
          this.idForOverlays();
          console.log(this.overlays);
        }
      }
    }
  }



  getOverlaysForCurrentImg(image: Image) {
    if (this.responseData) {
      let index = -1;
      for (let i = 0; i < this.responseData.length; i++) {
        if (image.id == this.responseData[i].image_id) {
          index = i;
        }
      }

      if (index == -1) {
        this.overlays = [];
        return;
      }
      //First Object in responsdata.results_recognition (interface Results, results_recognition) has unknown name and has to be handeld as key of a map.
      const keys = Object.keys(this.responseData[index].result_recognition);

      if (keys.length > 0) {
        const firstKey = keys[0];

        this.overlays = this.responseData[index].result_recognition[firstKey].elements;
        this.idForOverlays();
      }
    }
  }

  //Styles for overlays have to be created dynamically
  getOverlayStyle(imageElement: HTMLImageElement, overlay: any) {
    const originalWidth = imageElement.naturalWidth;
    const originalHeight = imageElement.naturalHeight;

    const { scaleFactorWidth, scaleFactorHeight } = this.getScaleFactor(imageElement, originalWidth, originalHeight);

    //Scale Overlays to current img size with scaleFactor
    const left = overlay.bbox_xyxy_abs[0] * scaleFactorWidth;
    const top = overlay.bbox_xyxy_abs[1] * scaleFactorHeight;
    const width = (overlay.bbox_xyxy_abs[2] - overlay.bbox_xyxy_abs[0]) * scaleFactorWidth;
    const height = (overlay.bbox_xyxy_abs[3] - overlay.bbox_xyxy_abs[1]) * scaleFactorHeight;

    return {
      'position': 'absolute',
      'left.px': left,
      'top.px': top,
      'width.px': width,
      'height.px': height,
      'border': '2px solid rgba(255, 102, 0, .5)',
      'z-index': '10',
    };
  }

  //Scalefactor for Overlays
  getScaleFactor(imageElement: HTMLImageElement, originalWidth: number, originalHeight: number) {
    const scaleFactorWidth = imageElement.width / originalWidth;
    const scaleFactorHeight = imageElement.height / originalHeight;
    return { scaleFactorWidth, scaleFactorHeight };
  }

  reloadLables() {
    var container = document.getElementById("overlays");
    if (container) {
      var content = container.innerHTML;
      container.innerHTML = content;
    }
  }

  reloadGallery() {
    var container = document.getElementById("visualization-Gallery");
    if (container) {
      var content = container.innerHTML;
      container.innerHTML = content;
    }
  }

  changeOverlay(overlay: OverlayRecognition): void {
    const dialogRef = this.dialog.open(ChangeOverlaysComponent, {
      width: '300px',
      data: {
        overlay: overlay,
      }
    });
  }

  downloadImg(image: Image) {
    if (this.responseData) {
      let results_url: string = '';

      for (let i = 0; i < this.responseData.length; i++) {
        if (this.responseData[i].image_id == image.id) {
          results_url = this.responseData[i].text_recognition_image_url;
        }
      }

      if (results_url != '') {
        this.http.get(results_url, { responseType: 'blob' }).subscribe(blob => {
          const a = document.createElement('a');
          const objectUrl = URL.createObjectURL(blob);

          a.href = objectUrl;
          a.download = image.old_name;
          a.click();

          URL.revokeObjectURL(objectUrl);
        });
      }
    }
  }

  idForOverlays() {
    for(let overlay of this.overlays) {
      overlay.id = this.genUniqueId();
    }
  }

  genUniqueId(): string {
    const dateStr = Date
      .now()
      .toString(36); // convert num to base 36 and stringify

    const randomStr = Math
      .random()
      .toString(36)
      .substring(2, 8); // start at index 2 to skip decimal point

    return `${dateStr}-${randomStr}`;
  }
}
