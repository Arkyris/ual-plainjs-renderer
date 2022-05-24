"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UALJs = void 0;
const universal_authenticator_library_1 = require("universal-authenticator-library");
const UALJsDom_1 = require("./UALJsDom");
/**
 * Plain JS implementation for UAL Interaction with UI
 */
class UALJs extends universal_authenticator_library_1.UAL {
    /**
     *
     * @param userCallbackHandler Called with the array of users after a successful authenticator selection
     * @param chains Array of Chains the application wants to support
     * @param appName Name of the application
     * @param authenticators List of authenticators this app supports
     * @param renderConfig Optional UI rendering configuration for environments not using login
     */
    constructor(userCallbackHandler, chains, appName, authenticators, renderConfig) {
        super(chains, appName, authenticators);
        this.isAutologin = false;
        this.accountNameInputValue = '';
        if (renderConfig) {
            this.renderConfig = renderConfig;
        }
        this.userCallbackHandler = userCallbackHandler;
        this.loginUser = this.loginUser.bind(this);
    }
    /**
     * Initializes UAL: If a renderConfig was provided and no autologin authenticator
     * is returned it will render the Auth Button and relevant DOM elements.
     *
     */
    init() {
        const authenticators = this.getAuthenticators();
        // perform this check first, if we're autologging in we don't render a dom
        if (!!authenticators.autoLoginAuthenticator) {
            this.isAutologin = true;
            this.loginUser(authenticators.autoLoginAuthenticator);
            this.activeAuthenticator = authenticators.autoLoginAuthenticator;
        }
        else {
            // check for existing session and resume if possible
            this.attemptSessionLogin(authenticators.availableAuthenticators);
            if (!this.renderConfig) {
                throw new Error('Render Configuration is required when no auto login authenticator is provided');
            }
            const { containerElement, buttonStyleOverride = false, } = this.renderConfig;
            this.dom = new UALJsDom_1.UALJsDom(this.loginUser, authenticators.availableAuthenticators, containerElement, buttonStyleOverride);
            this.dom.generateUIDom();
        }
    }
    /**
     * Attempts to resume a users session if they previously logged in
     *
     * @param authenticators Available authenticators for login
     */
    attemptSessionLogin(authenticators) {
        const sessionExpiration = localStorage.getItem(UALJs.SESSION_EXPIRATION_KEY) || null;
        if (sessionExpiration) {
            // clear session if it has expired and continue
            if (new Date(sessionExpiration) <= new Date()) {
                localStorage.clear();
            }
            else {
                const authenticatorName = localStorage.getItem(UALJs.SESSION_AUTHENTICATOR_KEY);
                const sessionAuthenticator = authenticators.find((authenticator) => authenticator.constructor.name === authenticatorName);
                const accountName = localStorage.getItem(UALJs.SESSION_ACCOUNT_NAME_KEY) || undefined;
                this.loginUser(sessionAuthenticator, accountName);
            }
        }
    }
    /**
     * App developer can call this directly with the preferred authenticator or render a
     * UI to let the user select their authenticator
     *
     * @param authenticator Authenticator chosen for login
     * @param accountName Account name (optional) of the user logging in
     */
    loginUser(authenticator, accountName) {
        return __awaiter(this, void 0, void 0, function* () {
            let users;
            // set the active authenticator so we can use it in logout
            this.activeAuthenticator = authenticator;
            const invalidateSeconds = this.activeAuthenticator.shouldInvalidateAfter();
            const invalidateAt = new Date();
            invalidateAt.setSeconds(invalidateAt.getSeconds() + invalidateSeconds);
            localStorage.setItem(UALJs.SESSION_EXPIRATION_KEY, invalidateAt.toString());
            localStorage.setItem(UALJs.SESSION_AUTHENTICATOR_KEY, authenticator.constructor.name);
            try {
                yield this.waitForAuthenticatorToLoad(authenticator);
                if (accountName) {
                    users = yield authenticator.login(accountName);
                    localStorage.setItem(UALJs.SESSION_ACCOUNT_NAME_KEY, accountName);
                }
                else {
                    users = yield authenticator.login();
                }
                // send our users back
                this.userCallbackHandler(users);
            }
            catch (e) {
                console.error('Error', e);
                console.error('Error cause', e.cause ? e.cause : '');
                this.clearStorageKeys();
                throw e;
            }
            // reset our modal state if we're not autologged in (no dom is rendered for autologin)
            if (!this.isAutologin) {
                this.dom.reset();
            }
        });
    }
    waitForAuthenticatorToLoad(authenticator) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve) => {
                if (!authenticator.isLoading()) {
                    resolve();
                    return;
                }
                const authenticatorIsLoadingCheck = setInterval(() => {
                    if (!authenticator.isLoading()) {
                        clearInterval(authenticatorIsLoadingCheck);
                        resolve();
                    }
                }, UALJs.AUTHENTICATOR_LOADING_INTERVAL);
            });
        });
    }
    /**
     * Clears the session data for the logged in user
     */
    logoutUser() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.activeAuthenticator) {
                throw Error('No active authenticator defined, did you login before attempting to logout?');
            }
            this.activeAuthenticator.logout();
            this.clearStorageKeys();
        });
    }
    clearStorageKeys() {
        // clear out our storage keys
        localStorage.removeItem(UALJs.SESSION_EXPIRATION_KEY);
        localStorage.removeItem(UALJs.SESSION_AUTHENTICATOR_KEY);
        localStorage.removeItem(UALJs.SESSION_ACCOUNT_NAME_KEY);
    }
}
exports.UALJs = UALJs;
UALJs.SESSION_EXPIRATION_KEY = 'ual-session-expiration';
UALJs.SESSION_AUTHENTICATOR_KEY = 'ual-session-authenticator';
UALJs.SESSION_ACCOUNT_NAME_KEY = 'ual-session-account-name';
UALJs.AUTHENTICATOR_LOADING_INTERVAL = 250;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVUFMSnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvVUFMSnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEscUZBQWlGO0FBQ2pGLHlDQUFxQztBQVVyQzs7R0FFRztBQUNILE1BQWEsS0FBTSxTQUFRLHFDQUFHO0lBZ0I1Qjs7Ozs7OztPQU9HO0lBQ0gsWUFDRSxtQkFBMkMsRUFDM0MsTUFBZSxFQUNmLE9BQWUsRUFDZixjQUErQixFQUMvQixZQUFnQztRQUVoQyxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQTtRQTlCakMsZ0JBQVcsR0FBWSxLQUFLLENBQUE7UUFTekIsMEJBQXFCLEdBQVcsRUFBRSxDQUFBO1FBdUIxQyxJQUFJLFlBQVksRUFBRTtZQUNoQixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQTtTQUNqQztRQUVELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxtQkFBbUIsQ0FBQTtRQUU5QyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzVDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksSUFBSTtRQUNULE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBRS9DLDBFQUEwRTtRQUMxRSxJQUFJLENBQUMsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLEVBQUU7WUFDM0MsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7WUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtZQUNyRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsY0FBYyxDQUFDLHNCQUFzQixDQUFBO1NBQ2pFO2FBQU07WUFDTCxvREFBb0Q7WUFDcEQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBRWhFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFO2dCQUN0QixNQUFNLElBQUksS0FBSyxDQUFDLCtFQUErRSxDQUFDLENBQUE7YUFDakc7WUFFRCxNQUFNLEVBQ0osZ0JBQWdCLEVBQ2hCLG1CQUFtQixHQUFHLEtBQUssR0FDNUIsR0FBRyxJQUFJLENBQUMsWUFBaUMsQ0FBQTtZQUUxQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksbUJBQVEsQ0FDckIsSUFBSSxDQUFDLFNBQVMsRUFDZCxjQUFjLENBQUMsdUJBQXVCLEVBQ3RDLGdCQUFnQixFQUNoQixtQkFBbUIsQ0FBQyxDQUFBO1lBRXRCLElBQUksQ0FBQyxHQUFJLENBQUMsYUFBYSxFQUFFLENBQUE7U0FDMUI7SUFDSCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLG1CQUFtQixDQUFDLGNBQStCO1FBQ3pELE1BQU0saUJBQWlCLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsSUFBSSxJQUFJLENBQUE7UUFDcEYsSUFBSSxpQkFBaUIsRUFBRTtZQUNyQiwrQ0FBK0M7WUFDL0MsSUFBSSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLElBQUksSUFBSSxFQUFFLEVBQUU7Z0JBQzdDLFlBQVksQ0FBQyxLQUFLLEVBQUUsQ0FBQTthQUNyQjtpQkFBTTtnQkFDTCxNQUFNLGlCQUFpQixHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7Z0JBQy9FLE1BQU0sb0JBQW9CLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FDOUMsQ0FBQyxhQUFhLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsSUFBSSxLQUFLLGlCQUFpQixDQUN2RCxDQUFBO2dCQUVsQixNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLFNBQVMsQ0FBQTtnQkFDckYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsRUFBRSxXQUFXLENBQUMsQ0FBQTthQUNsRDtTQUNGO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNVLFNBQVMsQ0FBQyxhQUE0QixFQUFFLFdBQW9COztZQUN2RSxJQUFJLEtBQWEsQ0FBQTtZQUVqQiwwREFBMEQ7WUFDMUQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGFBQWEsQ0FBQTtZQUV4QyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBQzFFLE1BQU0sWUFBWSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUE7WUFDL0IsWUFBWSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsQ0FBQTtZQUV0RSxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUMzRSxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxhQUFhLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBRXJGLElBQUk7Z0JBQ0YsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsYUFBYSxDQUFDLENBQUE7Z0JBRXBELElBQUksV0FBVyxFQUFFO29CQUNmLEtBQUssR0FBRyxNQUFNLGFBQWEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7b0JBRTlDLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLFdBQVcsQ0FBQyxDQUFBO2lCQUNsRTtxQkFBTTtvQkFDTCxLQUFLLEdBQUcsTUFBTSxhQUFhLENBQUMsS0FBSyxFQUFFLENBQUE7aUJBQ3BDO2dCQUVELHNCQUFzQjtnQkFDdEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFBO2FBRWhDO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNwRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtnQkFDdkIsTUFBTSxDQUFDLENBQUE7YUFDUjtZQUVELHNGQUFzRjtZQUN0RixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRTtnQkFDckIsSUFBSSxDQUFDLEdBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQTthQUNsQjtRQUNILENBQUM7S0FBQTtJQUVhLDBCQUEwQixDQUFDLGFBQTRCOztZQUNuRSxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzdCLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLEVBQUU7b0JBQzlCLE9BQU8sRUFBRSxDQUFBO29CQUNULE9BQU07aUJBQ1A7Z0JBQ0QsTUFBTSwyQkFBMkIsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFO29CQUNuRCxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxFQUFFO3dCQUM5QixhQUFhLENBQUMsMkJBQTJCLENBQUMsQ0FBQTt3QkFDMUMsT0FBTyxFQUFFLENBQUE7cUJBQ1Y7Z0JBQ0gsQ0FBQyxFQUFFLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFBO1lBQzFDLENBQUMsQ0FBQyxDQUFBO1FBQ0osQ0FBQztLQUFBO0lBRUQ7O09BRUc7SUFDVSxVQUFVOztZQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFO2dCQUM3QixNQUFNLEtBQUssQ0FBQyw2RUFBNkUsQ0FBQyxDQUFBO2FBQzNGO1lBRUQsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFBO1lBRWpDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3pCLENBQUM7S0FBQTtJQUVPLGdCQUFnQjtRQUN0Qiw2QkFBNkI7UUFDN0IsWUFBWSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUNyRCxZQUFZLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO1FBQ3hELFlBQVksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUE7SUFDekQsQ0FBQzs7QUFyTEgsc0JBc0xDO0FBbkxrQiw0QkFBc0IsR0FBRyx3QkFBd0IsQ0FBQTtBQUNqRCwrQkFBeUIsR0FBRywyQkFBMkIsQ0FBQTtBQUN2RCw4QkFBd0IsR0FBRywwQkFBMEIsQ0FBQTtBQUVyRCxvQ0FBOEIsR0FBRyxHQUFHLENBQUEifQ==