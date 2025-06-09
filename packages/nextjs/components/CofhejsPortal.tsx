import {
  useCofhejsActivePermit,
  useCofhejsAllPermits,
  useCofhejsCreatePermit,
  useCofhejsStatus,
} from "../app/useCofhejs";

export const CofhejsPortal = () => {
  const { chainId, initialized } = useCofhejsStatus();
  const activePermit = useCofhejsActivePermit();
  const allPermits = useCofhejsAllPermits();
  const createPermit = useCofhejsCreatePermit();

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <div tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-96">
        <div className="flex items-center gap-2 mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h2 className="text-xl font-bold">Cofhejs Portal</h2>
        </div>
        <div className="divider"></div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Initialization Status</h3>
          <div className="bg-base-200 p-4 rounded-lg">
            <p>
              <span className="font-semibold">Chain ID:</span> {chainId}
            </p>
            <p>
              <span className="font-semibold">Initialized:</span> {initialized ? "Yes" : "No"}
            </p>
          </div>
        </div>
        <div className="divider"></div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Permits</h3>
          {activePermit && (
            <div className="mb-4">
              <h4 className="text-md font-semibold mb-2">Active Permit</h4>
              <div className="bg-base-200 p-4 rounded-lg">
                <p>
                  <span className="font-semibold">Name:</span> {activePermit.name}
                </p>
                <p>
                  <span className="font-semibold">Type:</span> {activePermit.type}
                </p>
                <p>
                  <span className="font-semibold">Issuer:</span> {activePermit.issuer}
                </p>
                <p>
                  <span className="font-semibold">Expiration:</span>{" "}
                  {new Date(activePermit.expiration * 1000).toLocaleString()}
                </p>
              </div>
            </div>
          )}
          {allPermits && allPermits.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-semibold mb-2">All Permits</h4>
              <div className="space-y-2">
                {allPermits.map(
                  permit =>
                    permit.success && (
                      <div key={permit.data.name} className="bg-base-200 p-4 rounded-lg">
                        <p>
                          <span className="font-semibold">Name:</span> {permit.data.name}
                        </p>
                        <p>
                          <span className="font-semibold">Type:</span> {permit.data.type}
                        </p>
                        <p>
                          <span className="font-semibold">Issuer:</span> {permit.data.issuer}
                        </p>
                        <p>
                          <span className="font-semibold">Expiration:</span>{" "}
                          {new Date(permit.data.expiration * 1000).toLocaleString()}
                        </p>
                      </div>
                    ),
                )}
              </div>
            </div>
          )}
          <button className="btn btn-primary w-full" onClick={() => createPermit?.()} disabled={!createPermit}>
            Create New Permit
          </button>
        </div>
      </div>
    </div>
  );
};
