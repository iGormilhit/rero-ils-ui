/*
 * RERO ILS UI
 * Copyright (C) 2019 RERO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Component, OnInit } from '@angular/core';
import { UserService } from '../service/user.service';
import { CoreConfigService, TranslateService } from '@rero/ng-core';
import { marker as _ } from '@biesbjerg/ngx-translate-extract-marker';
import { TranslateService as NgxTranslateService } from '@ngx-translate/core';

@Component({
  selector: 'admin-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements OnInit {
  isCollapsed = true;
  lang: string = document.documentElement.lang;
  languages: string[];

  recordTypes = [];

  maxLengthSuggestion = 100;

  linksMenu = {};

  languagesMenu = {
    navCssClass: 'navbar-nav',
    entries: [{
      name: _('Menu'),
      iconCssClass: 'fa fa-bars',
      entries: [{
        name: _('Help'),
        iconCssClass: 'fa fa-help',
        href: 'https://ils.test.rero.ch/help'
      }]
    }]
  };

  userMenu = {
    navCssClass: 'navbar-nav',
    iconCssClass: 'fa fa-user',
    entries: []
  };

  private activeLanguagesMenuItem;

  constructor(
    private appTranslateService: TranslateService,
    private translateService: NgxTranslateService,
    private configService: CoreConfigService,
    private userService: UserService
  ) { }

  ngOnInit() {
    this.initLinksMenu();
    this.languages = this.configService.languages;
    for (const lang of this.languages) {
      const data: any = { name: lang };
      if (lang === this.lang) {
        data.active = true;
        this.activeLanguagesMenuItem = data;
      }
      this.languagesMenu.entries[0].entries.splice(0, 0, data);
    }
    const currentUser = this.userService.getCurrentUser();
    this.userMenu.entries.push({
      name: `${currentUser.first_name[0]}${currentUser.last_name[0]}`,
      entries: [
        {
          name: _('Logout'),
          href: `/logout`,
          iconCssClass: 'fa fa-sign-out'
        }
      ]
    });
    this.recordTypes = [{
      type: 'documents',
      field: 'autocomplete_title',
      getSuggestions: (query, persons) => this.getDocumentsSuggestions(query, persons)
    }, {
      type: 'persons',
      field: 'autocomplete_name',
      getSuggestions: (query, persons) => this.getPersonsSuggestions(query, persons)
    }];
  }

  initLinksMenu() {
    this.linksMenu = {
      navCssClass: 'navbar-nav',
      entries: [
        {
          name: _('User services'),
          iconCssClass: 'fa fa-users',
          entries: [{
            name: _('Circulation'),
            routerLink: '/circulation',
            iconCssClass: 'fa fa-exchange'
          }, {
            name: _('Patrons'),
            routerLink: '/records/patrons',
            iconCssClass: 'fa fa-users'
          }]
        }, {
          name: _('Catalog'),
          iconCssClass: 'fa fa-file-o',
          entries: [{
            name: _('Documents'),
            routerLink: '/records/documents',
            iconCssClass: 'fa fa-file-o'
          }, {
            name: _('Create a bibliographic record'),
            routerLink: '/records/documents/new',
            iconCssClass: 'fa fa-file-o'
          }, {
            name: _('Persons'),
            routerLink: '/records/persons',
            iconCssClass: 'fa fa-user'
          }]
        }, {
          name: _('Admin & Monitoring'),
          iconCssClass: 'fa fa-cogs',
          entries: [{
            name: _('Circulation policies'),
            routerLink: '/records/circ_policies',
            iconCssClass: 'fa fa-exchange'
          }, {
            name: _('Item types'),
            routerLink: '/records/item_types',
            iconCssClass: 'fa fa-file-o'
          }, {
            name: _('Patron types'),
            routerLink: '/records/patron_types',
            iconCssClass: 'fa fa-users'
          }, {
            name: _('My Library'),
            routerLink: `/records/libraries/detail/${this.userService.getCurrentUser().library.pid}`,
            iconCssClass: 'fa fa-university'
          }, {
            name: _('Libraries'),
            routerLink: '/records/libraries',
            iconCssClass: 'fa fa-university'
          }]
        }
      ]
    };
  }

  changeLang(item) {
    this.appTranslateService.setLanguage(item.name);
    delete (this.activeLanguagesMenuItem.active);
    item.active = true;
    this.activeLanguagesMenuItem = item;
  }

  getPersonsSuggestions(query, persons) {
    const values = [];
    persons.hits.hits.map(hit => {
      let text = this.getPersonName(hit.metadata);
      text = text.replace(new RegExp(query, 'gi'), `<b>${query}</b>`);
      values.push({
        text,
        query: '',
        pid: hit.metadata.pid,
        index: 'persons',
        category: this.translateService.instant('direct links'),
        href: `/records/persons/detail/${hit.metadata.pid}`,
        iconCssClass: 'fa fa-user'
      });
    });
    return values;
  }

  getDocumentsSuggestions(query, documents) {
    const values = [];
    documents.hits.hits.map(hit => {
      let text = hit.metadata.title;
      let truncate = false;
      if (text.length > this.maxLengthSuggestion) {
        truncate = true;
        text = hit.metadata.title.substr(0, this.maxLengthSuggestion);
      }
      text = text.replace(new RegExp(query, 'gi'), `<b>${query}</b>`);
      if (truncate) {
        text = text + ' ...';
      }
      values.push({
        text,
        query: hit.metadata.title.replace(/[:\-\[\]()/"]/g, ' ').replace(/\s\s+/g, ' '),
        index: 'documents',
        pid: undefined,
        category: this.translateService.instant('documents')
        // href: `/records/documents/detail/${hit.metadata.pid}`
      });
    });
    return values;
  }

  private getPersonName(metadata) {
    for (const source of ['rero', 'bnf', 'gnd']) {
      if (metadata[source] && metadata[source].preferred_name_for_person) {
        return metadata[source].preferred_name_for_person;
      }
    }
  }
}
