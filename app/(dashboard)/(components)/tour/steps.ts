type TourButtonHost = {
  complete: () => void;
  next: () => void;
  back: () => void;
};

const steps = [
  {
    id: "intro",
    attachTo: { element: "#logo-tour", on: "bottom" as const },
    beforeShowPromise: function () {
      return new Promise<void>(function (resolve) {
        setTimeout(function () {
          window.scrollTo(0, 0);
          resolve();
        }, 500);
      });
    },
    buttons: [
      {
        text: "Skip",
        classes: "btn btn-warning",
        action(this: TourButtonHost) {
          return this.complete();
        },
      },
      {
        classes: "btn btn-success",
        text: "Next",
        action(this: TourButtonHost) {
          return this.next();
        },
      },
    ],
    title: "Welcome Back !",
    text: ["This is Step 1"],
  },

  {
    id: "intro1",
    attachTo: { element: "#register-tour", on: "left" as const },

    buttons: [
      {
        text: "Back",
        classes: "btn btn-light",
        action(this: TourButtonHost) {
          return this.back();
        },
      },
      {
        text: "Skip",
        classes: "btn btn-warning",
        action(this: TourButtonHost) {
          return this.complete();
        },
      },
      {
        text: "Next",
        classes: "btn btn-success",
        action(this: TourButtonHost) {
          return this.next();
        },
      },
    ],
    title: "Register your account",
    text: "Get your Free DashTail account now.",
  },
  {
    id: "intro2",
    attachTo: { element: "#login-tour", on: "bottom" as const },
    buttons: [
      {
        text: "Back",
        classes: "btn btn-light",
        action(this: TourButtonHost) {
          return this.back();
        },
      },
      {
        text: "Skip",
        classes: "btn btn-warning",
        action(this: TourButtonHost) {
          return this.complete();
        },
      },
      {
        text: "Next",
        classes: "btn btn-success",
        action(this: TourButtonHost) {
          return this.next();
        },
      },
    ],
    title: "Login your account",
    text: "Sign in to continue to DashTail.",
  },
  {
    id: "intro3",
    attachTo: { element: "#getproduct-tour", on: "bottom" as const },
    buttons: [
      {
        text: "Back",
        classes: "btn btn-light",
        action(this: TourButtonHost) {
          return this.back();
        },
      },
      {
        text: "Skip",
        classes: "btn btn-warning",
        action(this: TourButtonHost) {
          return this.complete();
        },
      },
      {
        text: "Next",
        classes: "btn btn-success",
        action(this: TourButtonHost) {
          return this.next();
        },
      },
    ],
    title: "Get yout Product",
    text: "Sign in to continue to DashTail.",
  },
  {
    id: "intro4",
    attachTo: { element: "#thankyou-tour", on: "top" as const },
    buttons: [
      {
        text: "Back",
        classes: "btn btn-light",
        action(this: TourButtonHost) {
          return this.back();
        },
      },
      {
        text: "Thank you !",
        classes: "btn btn-primary",
        action(this: TourButtonHost) {
          return this.complete();
        },
      },
    ],
    title: "Thank you !",
    text: "Sign in to continue to DashTail.",
  },
];

export default steps;
