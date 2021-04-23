const BASE_URI = "https://sheets.googleapis.com/v4/spreadsheets/";

const buildFetcher = () => {
  let token: string;
  let authed: boolean = false;

  const doAuth = async (useCache: boolean) => {
    console.log("useCache", useCache);
    token = (
      await aha.auth("google_sheets", {
        useCachedRetry: useCache,
      })
    ).token;
    authed = true;
  };

  const authedFetch = async (url: string) => {
    if (!authed) {
      await doAuth(true);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if(authed && response.status === 401) {
      await doAuth(false);
      return authedFetch(url);
    }

    return response;
  };

  return authedFetch;
};
type Fetcher = ReturnType<typeof buildFetcher>;

export class Sheets {
  private fetcher: Fetcher;

  constructor() {
    this.fetcher = buildFetcher();
  }

  sheet(url: string): Sheet {
    const id = url.replace(/https?:\/\//, "").split("/")[3];
    if (!id) throw new Error(`Could not get sheet id from ${url}`);

    return new Sheet(this.fetcher, id);
  }
}

export interface Range {
  range: string;
  values: string[][];
  majorDimension: "ROWS";
}

export class Sheet {
  constructor(private sheetsFetch: Fetcher, private id: string) {}

  async range(range: string) {
    const url = `${BASE_URI}${this.id}/values/${range}`;
    const response = await this.sheetsFetch(url);
    return (await response.json()) as Range;
  }
}
